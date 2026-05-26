import bcrypt from "bcryptjs";
import { existsSync } from "fs";
import type { Request, Response } from "express";
import path from "path";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { absoluteFromStorageRoot } from "../services/documentStorageService";

const SHARE_TABLE = `\`${env.mysqlDatabase}\`.share_tokens`;

const SHARE_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS \`${env.mysqlDatabase}\`.share_tokens (
    id           VARCHAR(36)   NOT NULL,
    token        VARCHAR(64)   NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    document_id  VARCHAR(36)   NOT NULL,
    document_name VARCHAR(512) NOT NULL,
    file_path    VARCHAR(1024) NOT NULL,
    file_type    VARCHAR(50)   NOT NULL DEFAULT 'FILE',
    recipient_emails JSON      NOT NULL,
    expires_at   DATETIME      NOT NULL,
    otp_hash     VARCHAR(255)  NOT NULL,
    verified     TINYINT(1)    NOT NULL DEFAULT 0,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sht_token (token),
    KEY idx_sht_doc (document_id),
    KEY idx_sht_org (organization_id),
    KEY idx_sht_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

export const ensureShareTokensTable = async () => {
  await dbPool.query(SHARE_TABLE_DDL);
};

const isPathWithinStorageRoot = (storageRoot: string, candidateAbsolute: string): boolean => {
  const root = path.resolve(storageRoot);
  const abs = path.resolve(candidateAbsolute);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return abs === root || abs.startsWith(rootWithSep);
};

const MIME_MAP: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".txt":  "text/plain",
  ".csv":  "text/csv",
  ".doc":  "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls":  "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt":  "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip":  "application/zip",
};

export const shareController = {
  async getShareInfo(req: Request, res: Response) {
    try {
      await ensureShareTokensTable();
      const { token } = req.params;

      const [rows] = await dbPool.query(
        `SELECT document_name, expires_at, verified FROM ${SHARE_TABLE} WHERE token = ? LIMIT 1`,
        [token],
      );
      const row = (rows as Array<{ document_name: string; expires_at: Date; verified: number }>)[0];

      if (!row) return res.status(404).json({ message: "Share link not found" });
      if (new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ message: "This share link has expired" });
      }

      return res.status(200).json({
        documentName: row.document_name,
        expiresAt: new Date(row.expires_at).toISOString(),
        verified: Boolean(row.verified),
      });
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load share info" });
    }
  },

  async verifyShareOtp(req: Request, res: Response) {
    try {
      await ensureShareTokensTable();
      const { token } = req.params;
      const { otp } = req.body as { otp?: string };

      if (!otp || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: "Invalid OTP — must be 6 digits" });
      }

      const [rows] = await dbPool.query(
        `SELECT id, otp_hash, expires_at FROM ${SHARE_TABLE} WHERE token = ? LIMIT 1`,
        [token],
      );
      const row = (rows as Array<{ id: string; otp_hash: string; expires_at: Date }>)[0];

      if (!row) return res.status(404).json({ message: "Share link not found" });
      if (new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ message: "This share link has expired" });
      }

      const match = await bcrypt.compare(otp, row.otp_hash);
      if (!match) return res.status(401).json({ message: "Incorrect OTP code. Please try again." });

      await dbPool.query(`UPDATE ${SHARE_TABLE} SET verified = 1 WHERE id = ?`, [row.id]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify OTP" });
    }
  },

  async downloadSharedFile(req: Request, res: Response) {
    try {
      await ensureShareTokensTable();
      const { token } = req.params;

      const [rows] = await dbPool.query(
        `SELECT document_name, file_path, file_type, expires_at, verified FROM ${SHARE_TABLE} WHERE token = ? LIMIT 1`,
        [token],
      );
      const row = (rows as Array<{
        document_name: string;
        file_path: string;
        file_type: string;
        expires_at: Date;
        verified: number;
      }>)[0];

      if (!row) return res.status(404).json({ message: "Share link not found" });
      if (!row.verified) {
        return res.status(403).json({ message: "OTP verification required before downloading" });
      }
      if (new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ message: "This share link has expired" });
      }

      const relative = row.file_path.trim();
      if (!relative) return res.status(404).json({ message: "File not found" });

      const absolute = absoluteFromStorageRoot(env.storageRoot, relative);
      if (!isPathWithinStorageRoot(env.storageRoot, absolute)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      if (!existsSync(absolute)) return res.status(404).json({ message: "File missing on disk" });

      const ext = path.extname(row.document_name).toLowerCase();
      const mime = MIME_MAP[ext] ?? "application/octet-stream";
      const safeName = row.document_name.replace(/[\r\n"]/g, "_").trim() || "document";
      const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");

      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"`);
      res.sendFile(absolute, (err) => {
        if (err && !res.headersSent) res.status(500).json({ message: "Failed to send file" });
      });
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to download file" });
    }
  },
};
