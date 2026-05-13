import multer from "multer";

const maxFileBytes = 52 * 1024 * 1024;

const memory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes, fieldSize: 8 * 1024 * 1024, files: 120 },
});

export const memoryUploadSingle = memory.single("file");
export const memoryUploadBulk = memory.array("files", 100);
