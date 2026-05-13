import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";

const meRoute = Router();

meRoute.get("/", requireAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName,
    role: req.user.role,
  });
});

export default meRoute;
