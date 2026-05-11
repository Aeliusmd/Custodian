import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { requireAuth, requireRole } from "./middlewares/authMiddleware";
import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import superAdminRoutes from "./routes/superAdminRoutes";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/org-admin/settings", requireAuth, requireRole("ORG_ADMIN"), settingsRoutes);
app.use("/user/settings", requireAuth, requireRole("USER", "ORG_ADMIN"), settingsRoutes);
app.use("/super-admin/settings", requireAuth, requireRole("SUPER_ADMIN"), settingsRoutes);
app.use("/super-admin", requireAuth, requireRole("SUPER_ADMIN"), superAdminRoutes);

export default app;
