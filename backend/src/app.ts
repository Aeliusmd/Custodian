import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { requireAuth, requireRole } from "./middlewares/authMiddleware";
import { requestLogger } from "./middlewares/requestLogger";
import authRoutes from "./routes/authRoutes";
import meRoute from "./routes/meRoute";
import protectedRoutes from "./routes/protectedRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import shareRoutes from "./routes/shareRoutes";
import userSettingsRoutes from "./routes/userSettingsRoutes";
import superAdminRoutes from "./routes/superAdminRoutes";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
// Base64 in JSON is ~4/3 of raw bytes; allow headroom above the 52MB decoded cap in upload handlers.
app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/api/me", meRoute);
app.use("/protected", protectedRoutes);
app.use("/notifications", requireAuth, requireRole("USER", "ORG_ADMIN"), notificationRoutes);
app.use("/share", shareRoutes);
app.use("/org-admin/settings", requireAuth, requireRole("ORG_ADMIN"), settingsRoutes);
app.use("/user/settings", requireAuth, requireRole("USER", "ORG_ADMIN"), userSettingsRoutes);
app.use("/super-admin/settings", requireAuth, requireRole("SUPER_ADMIN"), settingsRoutes);
app.use("/super-admin", requireAuth, requireRole("SUPER_ADMIN"), superAdminRoutes);

export default app;
