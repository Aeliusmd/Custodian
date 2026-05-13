import type { NextFunction, Request, Response } from "express";

export const validateOwnUserId = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.params.userId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};
