import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.logHttp) {
    next();
    return;
  }
  if (req.method === "GET" && (req.path === "/health" || req.originalUrl.split("?")[0] === "/health")) {
    next();
    return;
  }
  const start = Date.now();
  res.on("finish", () => {
    logger.info("http", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
};
