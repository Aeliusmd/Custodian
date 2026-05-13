import { Router } from "express";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";

const authRoutes = Router();

authRoutes.post("/signin", authController.login);
authRoutes.post("/mfa/verify", authController.verifyLoginOtp);
authRoutes.post("/mfa/resend", authController.resendLoginOtp);
authRoutes.post("/signup", authController.signup);
authRoutes.get("/invite/validate", authController.validateInvite);
authRoutes.post("/invite/accept", authController.acceptInvite);
authRoutes.get("/session", requireAuth, authController.getSession);
authRoutes.post("/signout", authController.logout);

export default authRoutes;
