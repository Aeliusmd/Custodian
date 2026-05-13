import fs from "node:fs";
import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";
import { env, isProduction } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel = (): LogLevel => {
  const v = env.logLevel;
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return "info";
};

const shouldLog = (level: LogLevel): boolean => ORDER[level] >= ORDER[minLevel()];

let dirReady: Promise<void> | null = null;
const ensureLogDir = (): Promise<void> => {
  if (!dirReady) dirReady = mkdir(env.logDir, { recursive: true }).then(() => {});
  return dirReady;
};

const logPath = (): string => path.join(env.logDir, env.logFileName);

const formatLine = (level: LogLevel, message: string, meta?: Record<string, unknown>): string => {
  const ts = new Date().toISOString();
  const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level.toUpperCase()}] ${message}${suffix}\n`;
};

const writeFileAsync = async (line: string): Promise<void> => {
  if (!env.logToFile) return;
  try {
    await ensureLogDir();
    await appendFile(logPath(), line, "utf8");
  } catch {
    // ignore disk errors
  }
};

/** Synchronous append for fatal process errors (async may not run). */
export const appendLogLineSync = (line: string): void => {
  if (!env.logToFile) return;
  try {
    fs.mkdirSync(env.logDir, { recursive: true });
    fs.appendFileSync(logPath(), line, "utf8");
  } catch {
    // ignore
  }
};

const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  if (!shouldLog(level)) return;
  const line = formatLine(level, message, meta);
  void writeFileAsync(line);
  const trimmed = line.trimEnd();
  if (level === "error" || level === "warn") {
    console.error(trimmed);
  } else if (!isProduction) {
    console.log(trimmed);
  }
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
