import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3351),
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  nodeEnv: process.env.NODE_ENV ?? "development",
  mysqlHost: process.env.MYSQL_HOST ?? "127.0.0.1",
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
  mysqlUser: process.env.MYSQL_USER ?? "root",
  mysqlPassword: process.env.MYSQL_PASSWORD ?? "",
  mysqlDatabase: process.env.MYSQL_DATABASE ?? "custodian",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "no-reply@custodian.local",
  frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? "http://localhost:3001",
  /** Root directory for tenant document files (`uploads/...`). */
  storageRoot: process.env.STORAGE_ROOT?.trim() || path.join(process.cwd(), "storage"),
  ocrServiceUrl: (() => {
    const v = process.env.OCR_SERVICE_URL?.trim();
    if (v) return v;
    if ((process.env.NODE_ENV ?? "development") === "production") return "";
    return "http://127.0.0.1:8765/ocr";
  })(),
  ocrServiceTimeoutMs: Math.max(10_000, Number(process.env.OCR_SERVICE_TIMEOUT_MS ?? 600_000) || 600_000),
  ocrPdfMinNativeCharsToSkipExternal: Math.max(
    0,
    Number(process.env.OCR_PDF_MIN_NATIVE_CHARS_TO_SKIP_EXTERNAL ?? 200) || 200,
  ),
  /** Directory for `app.log` (created if missing). */
  logDir: process.env.LOG_DIR?.trim() || path.join(process.cwd(), "logs"),
  logFileName: process.env.LOG_FILE?.trim() || "app.log",
  /** Minimum level: debug | info | warn | error */
  logLevel: (process.env.LOG_LEVEL?.trim().toLowerCase() as "debug" | "info" | "warn" | "error") || "info",
  logHttp: process.env.LOG_HTTP !== "0" && process.env.LOG_HTTP !== "false",
  logToFile: process.env.LOG_TO_FILE !== "0" && process.env.LOG_TO_FILE !== "false",
};

export const isProduction = env.nodeEnv === "production";
