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
};
