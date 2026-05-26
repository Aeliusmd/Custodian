import nodemailer from "nodemailer";
import { env } from "../config/env";

const hasSmtpConfig =
  env.smtpHost.trim().length > 0 &&
  env.smtpUser.trim().length > 0 &&
  env.smtpPass.trim().length > 0;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  : null;

export const emailService = {
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    if (!transporter) {
      console.log(`[OTP-FALLBACK] email=${email} otp=${otp}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: email,
      subject: "Your Custodian OTP Code",
      text: `Your OTP code is ${otp}. This code will expire in 5 minutes.`,
      html: `<p>Your OTP code is <b>${otp}</b>.</p><p>This code will expire in 5 minutes.</p>`,
    });
  },

  async sendOrgAdminInviteEmail(params: {
    email: string;
    name: string;
    organizationName: string;
    inviteUrl: string;
    expiresMinutes: number;
  }): Promise<void> {
    const { email, name, organizationName, inviteUrl, expiresMinutes } = params;

    if (!transporter) {
      console.log(`[INVITE-FALLBACK] email=${email} org=${organizationName} invite=${inviteUrl}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: email,
      subject: `You're invited to ${organizationName} on Custodian`,
      text: `Hi ${name},\n\nYou've been invited as an Organization Admin for ${organizationName}.\nSet your password using this link (valid for ${expiresMinutes} minutes):\n${inviteUrl}\n\nIf you didn't expect this, please ignore this email.`,
      html: `<p>Hi ${name},</p>
             <p>You've been invited as an <b>Organization Admin</b> for <b>${organizationName}</b>.</p>
             <p>Set your password using this secure link (valid for <b>${expiresMinutes} minutes</b>):</p>
             <p><a href="${inviteUrl}">${inviteUrl}</a></p>
             <p>If you didn't expect this, please ignore this email.</p>`,
    });
  },

  /**
   * Notifies an org-admin that a new document was uploaded.
   *
   * @param opts.to           - Admin's email address.
   * @param opts.adminName    - Admin's display name.
   * @param opts.actorName    - Name of the user who uploaded the document.
   * @param opts.fileName     - Name of the uploaded file.
   * @param opts.categoryName - Category the document was filed under.
   * @param opts.orgName      - Organisation display name.
   */
  async sendDocumentUploadNotification(opts: {
    to: string;
    adminName: string;
    actorName?: string | undefined;
    fileName?: string | undefined;
    categoryName?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] document_upload to=${opts.to} file=${opts.fileName ?? "unknown"}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] New document uploaded${opts.fileName ? ": " + opts.fileName : ""}`,
      html: `<p>Hi ${opts.adminName},</p>
<p><strong>${opts.actorName ?? "A user"}</strong> uploaded a new document in <strong>${opts.orgName ?? "your organisation"}</strong>.</p>
<ul>
  <li><strong>File:</strong> ${opts.fileName ?? "Unknown"}</li>
  <li><strong>Category:</strong> ${opts.categoryName ?? "Uncategorised"}</li>
</ul>
<p>Log in to Custodox to review it.</p>`,
    });
  },

  /**
   * Notifies an org-admin that a document was shared.
   *
   * @param opts.to           - Admin's email address.
   * @param opts.adminName    - Admin's display name.
   * @param opts.actorName    - Name of the user who shared the document.
   * @param opts.fileName     - Name of the shared document.
   * @param opts.categoryName - Category the document belongs to.
   * @param opts.orgName      - Organisation display name.
   */
  async sendDocumentSharedNotification(opts: {
    to: string;
    adminName: string;
    actorName?: string | undefined;
    fileName?: string | undefined;
    categoryName?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] document_shared to=${opts.to} file=${opts.fileName ?? "unknown"}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Document shared: ${opts.fileName ?? "a document"}`,
      html: `<p>Hi ${opts.adminName},</p>
<p><strong>${opts.actorName ?? "A user"}</strong> shared a document in <strong>${opts.orgName ?? "your organisation"}</strong>.</p>
<ul>
  <li><strong>File:</strong> ${opts.fileName ?? "Unknown"}</li>
  <li><strong>Category:</strong> ${opts.categoryName ?? "Uncategorised"}</li>
</ul>
<p>Log in to Custodox to review it.</p>`,
    });
  },

  /**
   * Notifies an org-admin of a team membership change (user added, updated, or removed).
   *
   * @param opts.to          - Admin's email address.
   * @param opts.adminName   - Admin's display name.
   * @param opts.actorName   - Name of the admin who made the change.
   * @param opts.actionType  - 'added' | 'updated' | 'removed'.
   * @param opts.userName    - Display name of the affected user.
   * @param opts.userEmail   - Email of the affected user.
   * @param opts.orgName     - Organisation display name.
   */
  async sendUserManagementNotification(opts: {
    to: string;
    adminName: string;
    actorName?: string | undefined;
    actionType?: string | undefined;
    userName?: string | undefined;
    userEmail?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] team_update to=${opts.to} action=${opts.actionType ?? "changed"}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Team update: user ${opts.actionType ?? "changed"}`,
      html: `<p>Hi ${opts.adminName},</p>
<p><strong>${opts.actorName ?? "An admin"}</strong> ${opts.actionType ?? "changed"} user <strong>${opts.userName ?? "unknown"}</strong>${opts.userEmail ? " (" + opts.userEmail + ")" : ""} in <strong>${opts.orgName ?? "your organisation"}</strong>.</p>
<p>Log in to Custodox to review the team roster.</p>`,
    });
  },

  /**
   * Notifies an org-admin that a user has signed in.
   *
   * @param opts.to        - Admin's email address.
   * @param opts.adminName - Admin's display name.
   * @param opts.userName  - Display name of the user who signed in.
   * @param opts.userEmail - Email of the user who signed in.
   * @param opts.loginTime - Human-readable login timestamp.
   * @param opts.orgName   - Organisation display name.
   */
  async sendLoginAlertNotification(opts: {
    to: string;
    adminName: string;
    userName?: string | undefined;
    userEmail?: string | undefined;
    loginTime?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] login_alert to=${opts.to} user=${opts.userName ?? "unknown"}`);
      return;
    }

    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Login alert: ${opts.userName ?? "A user"} signed in`,
      html: `<p>Hi ${opts.adminName},</p>
<p><strong>${opts.userName ?? "A user"}</strong>${opts.userEmail ? " (" + opts.userEmail + ")" : ""} signed in to <strong>${opts.orgName ?? "your organisation"}</strong>${opts.loginTime ? " at " + opts.loginTime : ""}.</p>
<p>If this was unexpected, please review your team's access in Custodox.</p>`,
    });
  },

  async sendVersionUpdateNotification(opts: {
    to: string;
    adminName: string;
    actorName?: string | undefined;
    fileName?: string | undefined;
    categoryName?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] version_update to=${opts.to} file=${opts.fileName ?? "unknown"}`);
      return;
    }
    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Document updated: ${opts.fileName ?? "a document"}`,
      html: `<p>Hi ${opts.adminName},</p>
<p><strong>${opts.actorName ?? "A user"}</strong> updated a document in <strong>${opts.orgName ?? "your organisation"}</strong>.</p>
<ul>
  <li><strong>File:</strong> ${opts.fileName ?? "Unknown"}</li>
  <li><strong>Category:</strong> ${opts.categoryName ?? "Uncategorised"}</li>
</ul>
<p>Log in to Custodox to review the latest changes.</p>`,
    });
  },

  async sendStorageAlertNotification(opts: {
    to: string;
    adminName: string;
    storageUsedGb: number;
    storageTotalGb: number;
    storagePercent: number;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] storage_alert to=${opts.to} percent=${opts.storagePercent}%`);
      return;
    }
    const isCritical = opts.storagePercent >= 95;
    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Storage ${isCritical ? "critical" : "warning"}: ${opts.storagePercent}% used — ${opts.orgName ?? "your organisation"}`,
      html: `<p>Hi ${opts.adminName},</p>
<p>Your organisation <strong>${opts.orgName ?? ""}</strong> has used <strong>${opts.storagePercent}%</strong> of its storage allocation.</p>
<ul>
  <li><strong>Used:</strong> ${opts.storageUsedGb.toFixed(2)} GB</li>
  <li><strong>Limit:</strong> ${opts.storageTotalGb.toFixed(2)} GB</li>
</ul>
<p>${isCritical ? "&#9888; <strong>Critical:</strong> You are nearly out of storage. Upgrade your plan or remove unused documents immediately." : "&#9888; <strong>Warning:</strong> You are approaching your storage limit. Consider upgrading your plan or removing unused documents."}</p>`,
    });
  },

  async sendWeeklyReportNotification(opts: {
    to: string;
    adminName: string;
    orgName?: string | undefined;
    totalDocuments: number;
    uploadsThisWeek: number;
    activeUsers: number;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[NOTIFY-FALLBACK] weekly_report to=${opts.to}`);
      return;
    }
    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] Weekly summary — ${opts.orgName ?? "your organisation"}`,
      html: `<p>Hi ${opts.adminName},</p>
<p>Here is your weekly activity summary for <strong>${opts.orgName ?? "your organisation"}</strong>:</p>
<ul>
  <li><strong>Uploads this week:</strong> ${opts.uploadsThisWeek}</li>
  <li><strong>Total documents:</strong> ${opts.totalDocuments}</li>
  <li><strong>Active users:</strong> ${opts.activeUsers}</li>
</ul>
<p>Log in to Custodox to view the full activity report.</p>`,
    });
  },

  async sendShareLinkEmail(opts: {
    to: string;
    documentName: string;
    shareLink: string;
    otp: string;
    expiresIn: string;
    sharedByName?: string | undefined;
    orgName?: string | undefined;
  }): Promise<void> {
    if (!transporter) {
      console.log(`[SHARE-FALLBACK] email=${opts.to} doc=${opts.documentName} otp=${opts.otp}`);
      return;
    }
    await transporter.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: `[Custodox] You've been granted access to "${opts.documentName}"`,
      html: `<p>Hi,</p>
<p><strong>${opts.sharedByName ?? "An administrator"}</strong> has shared a document with you${opts.orgName ? ` from <strong>${opts.orgName}</strong>` : ""}.</p>
<p><strong>Document:</strong> ${opts.documentName}</p>
<p>Click the link below to access it. You will be asked to enter your OTP code to verify your identity before downloading.</p>
<p><a href="${opts.shareLink}" style="display:inline-block;padding:10px 20px;background:#0097B2;color:#fff;text-decoration:none;border-radius:6px;">Access Document</a></p>
<p>Or copy this link: <code>${opts.shareLink}</code></p>
<p><strong>Your verification code:</strong></p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0097B2;">${opts.otp}</p>
<p><em>This link expires in ${opts.expiresIn}. Do not share your OTP with anyone.</em></p>
<p>If you didn't expect this, you can safely ignore this email.</p>`,
      text: `You've been given access to "${opts.documentName}".\n\nLink: ${opts.shareLink}\nOTP Code: ${opts.otp}\nExpires in: ${opts.expiresIn}`,
    });
  },
};
