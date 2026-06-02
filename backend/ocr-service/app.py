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
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import img2pdf
import ocrmypdf
import fitz  # PyMuPDF — renders PDF pages to PNG images for the page-by-page viewer
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel
from pypdf import PdfReader

# ----- Hardcoded server & OCR settings (edit here; Node `OCR_SERVICE_URL` must match) -----
HOST = "0.0.0.0"
PORT = 8765
UVICORN_LOG_LEVEL = "info"

OCR_LANGUAGE = "eng"
# Options: 'default' (error on existing text), 'skip' (skip pages with text), 'force' (force OCR), 'redo' (redo OCR)
OCR_MODE = "skip"
OCR_DESKEW = False
OCR_SKIP_BIG_MB = 100

# Max documents processed concurrently; all others wait in the asyncio queue.
MAX_CONCURRENT_OCR = 10

QPDF_ARGS = ["qpdf", "--linearize"]

# Optional override for Windows / custom installs (e.g. C:\Program Files\LibreOffice\program\soffice.exe)
LIBREOFFICE_PATH = os.environ.get("LIBREOFFICE_PATH", "").strip()

OFFICE_EXT = {
    ".doc",
    ".docx",
    ".dot",
    ".dotx",
    ".xls",
    ".xlsx",
    ".xlsm",
    ".xlsb",
    ".ppt",
    ".pptx",
    ".potx",
    ".odt",
    ".ods",
    ".odp",
    ".rtf",
}

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}

app = FastAPI(title="Custodian OCR service", version="3.1.0")

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


def resolve_soffice_executable() -> str | None:
    if LIBREOFFICE_PATH and Path(LIBREOFFICE_PATH).is_file():
        return LIBREOFFICE_PATH
    return shutil.which("soffice") or shutil.which("libreoffice")


def convert_office_to_pdf(input_path: Path, out_dir: Path) -> Path:
    soffice = resolve_soffice_executable()
    if not soffice:
        raise HTTPException(
            status_code=503,
            detail="LibreOffice (soffice) is not installed or not on PATH. Set LIBREOFFICE_PATH.",
        )
    try:
        subprocess.run(
            [
                soffice,
                "--headless",
                "--norestore",
                "--nolockcheck",
                "--nodefault",
                "--nofirststartwizard",
                "--convert-to",
                "pdf",
                "--outdir",
                str(out_dir),
                str(input_path),
            ],
            check=True,
            capture_output=True,
            timeout=300,
        )
    except subprocess.TimeoutExpired as e:
        raise HTTPException(status_code=504, detail="LibreOffice conversion timed out") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace")[:500]
        raise HTTPException(status_code=422, detail=f"LibreOffice conversion failed: {stderr}") from e

    expected = out_dir / f"{input_path.stem}.pdf"
    if expected.is_file():
        return expected
    pdfs = sorted(out_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    if pdfs:
        return pdfs[0]
    raise HTTPException(status_code=422, detail="LibreOffice did not produce a PDF output")


def convert_upload_to_pdf_bytes(raw: bytes, filename: str) -> bytes:
    """Return PDF bytes for PDF, image, or Office uploads."""
    if bytes_look_like_pdf(raw):
        return raw

    suffix = Path(filename or "upload").suffix.lower()
    if not suffix:
        suffix = ".bin"

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        in_path = save_upload_to_temp(raw, filename, td_path)

        if suffix in IMAGE_EXT or suffix == ".pdf":
            pdf_path = ensure_input_pdf(in_path)
            return pdf_path.read_bytes()

        if suffix in OFFICE_EXT:
            pdf_path = convert_office_to_pdf(in_path, td_path)
            return pdf_path.read_bytes()

        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type for PDF conversion: {suffix or '(none)'}",
        )


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
                mode=OCR_MODE,
                deskew=OCR_DESKEW,
                language=OCR_LANGUAGE,
                skip_big=OCR_SKIP_BIG_MB,
                output_type="pdf",
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
        "libreoffice": "available" if resolve_soffice_executable() else "missing",
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


@app.post("/convert-to-pdf")
async def convert_to_pdf_endpoint(file: UploadFile = File(...)) -> Response:
    """
    Convert an uploaded document to PDF for unified in-browser preview.
    PDF passthrough; images via img2pdf; Office via LibreOffice headless.
    """
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = file.filename or "upload"

    loop = asyncio.get_running_loop()
    pdf_bytes = await loop.run_in_executor(_executor, convert_upload_to_pdf_bytes, raw, filename)
    return Response(content=pdf_bytes, media_type="application/pdf")


@app.post("/render-page")
async def render_page_endpoint(
    file: UploadFile = File(...),
    page: int = Form(1),
    dpi: int = Form(150),
) -> Response:
    """
    Render a single PDF page to a PNG image (for the page-by-page document viewer).
    The Node backend calls this on demand and caches the result on disk, so each
    page is rasterized at most once.
    """
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if not bytes_look_like_pdf(raw):
        raise HTTPException(status_code=415, detail="Only PDF files can be rendered to page images")

    page_no = max(1, int(page))
    render_dpi = min(300, max(72, int(dpi)))

    def _render() -> bytes:
        doc = fitz.open(stream=raw, filetype="pdf")
        try:
            if page_no > doc.page_count:
                raise HTTPException(status_code=404, detail="Page out of range")
            pix = doc.load_page(page_no - 1).get_pixmap(dpi=render_dpi)
            return pix.tobytes("png")
        finally:
            doc.close()

    loop = asyncio.get_running_loop()
    png_bytes = await loop.run_in_executor(_executor, _render)
    return Response(content=png_bytes, media_type="image/png")


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
