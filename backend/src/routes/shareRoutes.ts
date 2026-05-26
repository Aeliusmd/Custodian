import { Router } from "express";
import { shareController } from "../controllers/shareController";

const shareRoutes = Router();

shareRoutes.get("/:token", shareController.getShareInfo);
shareRoutes.post("/:token/verify", shareController.verifyShareOtp);
shareRoutes.get("/:token/download", shareController.downloadSharedFile);

export default shareRoutes;
