"""
OCR microservice aligned with the Custodian Node backend:

  POST /ocr  — multipart field `file` (same as `documentOcrExternalClient.ts`)
  Response   — JSON `{ "text": "..." }` (plain UTF-8 text for `uploads/ocr/{id}.txt`)

Internally: repair PDF (qpdf, optional) → OCRmyPDF on full PDF →
extract embedded text with pypdf (searchable layer from OCRmyPDF).

Concurrency: up to MAX_CONCURRENT_OCR jobs run in a ThreadPoolExecutor;
additional requests queue automatically (FastAPI + asyncio handles backpressure).

Run from this directory:  python app.py

Requires on PATH: qpdf (optional), ocrmypdf uses Ghostscript/Tesseract as per ocrmypdf install docs.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import img2pdf
import ocrmypdf
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel
from pypdf import PdfReader

# ----- Hardcoded server & OCR settings (edit here; Node `OCR_SERVICE_URL` must match) -----
HOST = "0.0.0.0"
PORT = 8765
UVICORN_LOG_LEVEL = "info"

OCR_LANGUAGE = "eng"
OCR_FORCE_OCR = True
OCR_DESKEW = False
OCR_SKIP_BIG_MB = 100

# Max documents processed concurrently; all others wait in the asyncio queue.
MAX_CONCURRENT_OCR = 10

QPDF_ARGS = ["qpdf", "--linearize"]

app = FastAPI(title="Custodian OCR service", version="3.0.0")

# Thread pool sized exactly to our concurrency limit.
# ocrmypdf releases the GIL for its heavy Tesseract/Ghostscript work,
# so true parallelism is achieved even in CPython.
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_OCR, thread_name_prefix="ocr-worker")

# Semaphore ensures at most MAX_CONCURRENT_OCR coroutines submit work to the
# executor at once; all others await here, forming the queue.
_ocr_semaphore = asyncio.Semaphore(MAX_CONCURRENT_OCR)


class OcrPage(BaseModel):
    page: int
    text: str


class OcrResponse(BaseModel):
    """Node accepts `text` or `markdown`; we send both as the same plain string."""
    text: str
    markdown: str
    pages: list[OcrPage]


# ---------------------------------------------------------------------------
# PDF helpers
# ---------------------------------------------------------------------------

def repair_pdf(input_file: str, repaired_file: str) -> bool:
    try:
        subprocess.run(
            [*QPDF_ARGS, input_file, repaired_file],
            check=True,
            capture_output=True,
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def extract_text_from_pdf(pdf_path: str) -> tuple[str, list[OcrPage]]:
    """Read searchable text from the OCR'd PDF, one entry per page (1-based)."""
    reader = PdfReader(pdf_path)
    pages: list[OcrPage] = []
    for i, page in enumerate(reader.pages, start=1):
        t = page.extract_text()
        if t and t.strip():
            pages.append(OcrPage(page=i, text=t.strip()))
    joined = "\n\n".join(p.text for p in pages).strip()
    return joined, pages


def bytes_look_like_pdf(data: bytes) -> bool:
    return len(data) >= 5 and data[:5] == b"%PDF-"


def save_upload_to_temp(data: bytes, original_name: str, parent: Path) -> Path:
    suffix = Path(original_name or "upload").suffix.lower()
    if not suffix:
        suffix = ".pdf" if bytes_look_like_pdf(data) else ".bin"
    fd, tmp = tempfile.mkstemp(suffix=suffix, prefix="custodian-ocr-", dir=str(parent))
    os.close(fd)
    path = Path(tmp)
    path.write_bytes(data)
    return path


def ensure_input_pdf(input_path: Path) -> Path:
    """Non-PDF images → single-page PDF so the same pipeline handles everything."""
    data = input_path.read_bytes()
    if input_path.suffix.lower() == ".pdf" or bytes_look_like_pdf(data):
        return input_path

    ext = input_path.suffix.lower()
    image_exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
    if ext not in image_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type for OCR service: {ext or '(none)'}",
        )

    out_pdf = input_path.parent / "_input_from_image.pdf"
    try:
        im = Image.open(input_path)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        png_tmp = input_path.parent / "_rgb.png"
        im.save(png_tmp, "PNG")
        with open(out_pdf, "wb") as f:
            f.write(img2pdf.convert(str(png_tmp)))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not convert image to PDF: {e}") from e
    return out_pdf


# ---------------------------------------------------------------------------
# Core OCR work — runs inside the thread pool
# ---------------------------------------------------------------------------

def _run_ocr_sync(raw: bytes, filename: str) -> tuple[str, list[OcrPage]]:
    """
    Blocking OCR pipeline executed in a worker thread.
    Returns extracted plain text.
    Raises HTTPException on failure (FastAPI handles these from threads too).
    """
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        in_path = save_upload_to_temp(raw, filename, td_path)
        try:
            pdf_in = ensure_input_pdf(in_path)

            repaired_pdf = td_path / "fixed.pdf"
            repaired_ok = repair_pdf(str(pdf_in), str(repaired_pdf))
            source_pdf = str(repaired_pdf if repaired_ok and repaired_pdf.exists() else pdf_in)

            final_pdf = td_path / "ocr_output.pdf"
            ocrmypdf.ocr(
                source_pdf,
                str(final_pdf),
                force_ocr=OCR_FORCE_OCR,
                deskew=OCR_DESKEW,
                language=OCR_LANGUAGE,
                skip_big=OCR_SKIP_BIG_MB,
            )

            text, pages = extract_text_from_pdf(str(final_pdf))
            if not text:
                raise HTTPException(
                    status_code=422,
                    detail="OCR finished but no extractable text was found in the PDF",
                )
            return text, pages
        finally:
            try:
                in_path.unlink(missing_ok=True)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, str]:
    active = MAX_CONCURRENT_OCR - _ocr_semaphore._value  # type: ignore[attr-defined]
    return {
        "status": "ok",
        "workers_total": str(MAX_CONCURRENT_OCR),
        "workers_busy": str(active),
        "workers_free": str(_ocr_semaphore._value),  # type: ignore[attr-defined]
    }


@app.post("/ocr", response_model=OcrResponse)
async def ocr_endpoint(file: UploadFile = File(...)) -> OcrResponse:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    filename = file.filename or "upload"

    # Acquire a slot; if all 10 workers are busy this coroutine suspends here
    # (the HTTP connection is held open) until a slot is free.
    async with _ocr_semaphore:
        loop = asyncio.get_running_loop()
        text, pages = await loop.run_in_executor(_executor, _run_ocr_sync, raw, filename)

    return OcrResponse(text=text, markdown=text, pages=pages)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    import uvicorn

    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level=UVICORN_LOG_LEVEL,
    )


if __name__ == "__main__":
    main()