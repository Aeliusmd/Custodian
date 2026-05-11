import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/authService";
import type { Role } from "../types/auth";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = await authService.verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
};
