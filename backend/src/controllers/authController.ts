import type { Request, Response } from "express";
import { isProduction } from "../config/env";
import { authService } from "../services/authService";
import type { Role } from "../types/auth";

const roleDashboardMap: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ORG_ADMIN: "/org-admin/dashboard",
  USER: "/user",
};

const setSessionCookie = (res: Response, token: string, rememberMe?: boolean) => {
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24,
  });
};

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;
      const challenge = await authService.login({ email, password, rememberMe });
      return res.status(200).json({
        mfaRequired: true,
        challengeId: challenge.challengeId,
        email: challenge.email,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return res.status(401).json({ message });
    }
  },

  async verifyLoginOtp(req: Request, res: Response) {
    try {
      const { challengeId, code } = req.body;
      const authResult = await authService.verifyLoginOtp(challengeId, code);
      setSessionCookie(res, authResult.token, authResult.rememberMe);
      return res.status(200).json({
        user: authResult.user,
        redirectTo: roleDashboardMap[authResult.user.role],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
      return res.status(401).json({ message });
    }
  },

  async resendLoginOtp(req: Request, res: Response) {
    try {
      const { challengeId } = req.body;
      await authService.resendLoginOtp(challengeId);
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP";
      return res.status(400).json({ message });
    }
  },

  async signup(req: Request, res: Response) {
    try {
      const authResult = await authService.signup(req.body);
      setSessionCookie(res, authResult.token, true);

      return res.status(201).json({
        user: authResult.user,
        redirectTo: roleDashboardMap[authResult.user.role],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      return res.status(400).json({ message });
    }
  },

  getSession(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(200).json({
      user: req.user,
      redirectTo: roleDashboardMap[req.user.role],
    });
  },

  logout(_req: Request, res: Response) {
    res.clearCookie("access_token");
    return res.status(200).json({ success: true });
  },

  async validateInvite(req: Request, res: Response) {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      if (!token) {
        return res.status(400).json({ message: "Invite token is required" });
      }
      const invite = await authService.validateInviteToken(token);
      return res.status(200).json(invite);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite validation failed";
      return res.status(400).json({ message });
    }
  },

  async acceptInvite(req: Request, res: Response) {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      await authService.acceptInviteAndSetPassword(token, password);
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite acceptance failed";
      return res.status(400).json({ message });
    }
  },
};
