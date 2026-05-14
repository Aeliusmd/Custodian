import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { superAdminAuthModel } from "../models/superAdminAuthModel";
import { emailService } from "./emailService";
import { userModel } from "../models/userModel";
import type { LoginIdentity, LoginPayload, SafeUser, SignupPayload } from "../types/auth";

interface AuthResult {
  token: string;
  user: SafeUser;
}

interface LoginChallengeResult {
  challengeId: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  role?: SafeUser["role"];
  organizationId?: string;
  organizationDbName?: string;
}

const toSafeUserFromMemory = async (userId: string): Promise<SafeUser> => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    isActive: user.isActive,
  };
};

const toSafeSuperAdmin = async (userId: string): Promise<SafeUser> => {
  const superAdmin = await superAdminAuthModel.findById(userId);
  if (!superAdmin) {
    throw new Error("User not found");
  }

  return {
    id: superAdmin.id,
    email: superAdmin.email,
    fullName: superAdmin.name,
    role: "SUPER_ADMIN",
    organizationId: "system",
    isActive: superAdmin.status === "active",
  };
};

const jwtSecret: Secret = env.jwtSecret;
const jwtSignOptions: SignOptions = {
  expiresIn: env.jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>,
};

interface OtpChallenge {
  challengeId: string;
  rememberMe: boolean;
  user: LoginIdentity;
  otpCode: string;
  expiresAt: number;
}

const otpChallenges = new Map<string, OtpChallenge>();

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const challengeTtlMs = 5 * 60 * 1000;

const cleanupExpiredChallenges = () => {
  const now = Date.now();
  for (const [id, challenge] of otpChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      otpChallenges.delete(id);
    }
  }
};

const toSafeUser = (identity: LoginIdentity): SafeUser => ({
  id: identity.id,
  email: identity.email,
  fullName: identity.fullName,
  role: identity.role,
  organizationId: identity.organizationId,
  isActive: identity.isActive,
});

const mapTenantRole = (dbRole: string): SafeUser["role"] =>
  dbRole.toLowerCase() === "org_admin" ? "ORG_ADMIN" : "USER";

const getActiveOrganizations = async (): Promise<Array<{ id: string; db_name: string; status: string }>> => {
  const [rows] = await dbPool.query(
    `SELECT id, db_name, status
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE (is_deleted = 0 OR is_deleted IS NULL)`,
  );
  return rows as Array<{ id: string; db_name: string; status: string }>;
};

const findTenantUserByEmail = async (
  email: string,
): Promise<{ identity: LoginIdentity; passwordHash: string } | null> => {
  const orgs = await getActiveOrganizations();
  const normalizedEmail = email.trim().toLowerCase();
  const matches: Array<{ identity: LoginIdentity; passwordHash: string }> = [];

  for (const org of orgs) {
    if (!org.db_name) continue;
    const [rows] = await dbPool.query(
      `SELECT id, name, email, password_hash AS passwordHash, role, status
         FROM \`${org.db_name}\`.users
        WHERE LOWER(email) = ?
        LIMIT 1`,
      [normalizedEmail],
    );
    const row = (rows as Array<{
      id: string;
      name: string;
      email: string;
      passwordHash: string;
      role: string;
      status: string;
    }>)[0];
    if (!row) continue;
    matches.push({
      identity: {
        id: row.id,
        email: row.email,
        fullName: row.name,
        role: mapTenantRole(row.role),
        organizationId: org.id,
        organizationDbName: org.db_name,
        isActive: row.status.toLowerCase() === "active" && org.status.toLowerCase() === "active",
      },
      passwordHash: row.passwordHash,
    });
  }

  if (matches.length > 1) {
    throw new Error("Multiple organizations contain this email. Contact support.");
  }
  return matches[0] ?? null;
};

const findTenantUserById = async (
  userId: string,
  roleHint: SafeUser["role"] | undefined,
  organizationDbName: string | undefined,
  organizationId: string | undefined,
): Promise<SafeUser | null> => {
  if (organizationDbName && organizationId) {
    const [rows] = await dbPool.query(
      `SELECT id, name, email, role, status
         FROM \`${organizationDbName}\`.users
        WHERE id = ?
        LIMIT 1`,
      [userId],
    );
    const row = (rows as Array<{ id: string; name: string; email: string; role: string; status: string }>)[0];
    if (!row) return null;
    const resolvedRole = mapTenantRole(row.role);
    if (roleHint && roleHint !== resolvedRole) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      fullName: row.name,
      role: resolvedRole,
      organizationId,
      isActive: row.status.toLowerCase() === "active",
    };
  }

  const orgs = await getActiveOrganizations();
  for (const org of orgs) {
    if (!org.db_name) continue;
    const [rows] = await dbPool.query(
      `SELECT id, name, email, role, status
         FROM \`${org.db_name}\`.users
        WHERE id = ?
        LIMIT 1`,
      [userId],
    );
    const row = (rows as Array<{ id: string; name: string; email: string; role: string; status: string }>)[0];
    if (!row) continue;
    const resolvedRole = mapTenantRole(row.role);
    if (roleHint && roleHint !== resolvedRole) {
      continue;
    }
    return {
      id: row.id,
      email: row.email,
      fullName: row.name,
      role: resolvedRole,
      organizationId: org.id,
      isActive: row.status.toLowerCase() === "active" && org.status.toLowerCase() === "active",
    };
  }

  return null;
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginChallengeResult> {
    cleanupExpiredChallenges();

    let loginIdentity: LoginIdentity | null = null;
    const superAdmin = await superAdminAuthModel.findByEmail(payload.email);
    if (superAdmin) {
      if (superAdmin.status !== "active") {
        throw new Error("User account is inactive");
      }

      const isValidSuperAdminPassword = await bcrypt.compare(payload.password, superAdmin.passwordHash);
      if (!isValidSuperAdminPassword) {
        throw new Error("Invalid credentials");
      }

      loginIdentity = {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.name,
        role: "SUPER_ADMIN",
        organizationId: "system",
        isActive: true,
      };
    } else {
      const tenantAuthRecord = await findTenantUserByEmail(payload.email);
      if (!tenantAuthRecord?.identity?.isActive) {
        throw new Error("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(payload.password, tenantAuthRecord.passwordHash);
      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      loginIdentity = tenantAuthRecord.identity;
    }

    if (!loginIdentity) {
      throw new Error("Invalid credentials");
    }

    const challengeId = crypto.randomUUID();
    const otpCode = generateOtpCode();
    otpChallenges.set(challengeId, {
      challengeId,
      rememberMe: Boolean(payload.rememberMe),
      user: loginIdentity,
      otpCode,
      expiresAt: Date.now() + challengeTtlMs,
    });

    await emailService.sendOtpEmail(loginIdentity.email, otpCode);

    return { challengeId, email: loginIdentity.email };
  },

  async verifyLoginOtp(challengeId: string, otpCode: string): Promise<AuthResult & { rememberMe: boolean }> {
    cleanupExpiredChallenges();
    const challenge = otpChallenges.get(challengeId);
    if (!challenge) {
      throw new Error("OTP challenge expired. Please login again.");
    }
    if (challenge.otpCode !== otpCode) {
      throw new Error("Invalid verification code");
    }
    if (challenge.expiresAt <= Date.now()) {
      otpChallenges.delete(challengeId);
      throw new Error("OTP expired. Please login again.");
    }

    otpChallenges.delete(challengeId);
    const token = jwt.sign(
      {
        sub: challenge.user.id,
        role: challenge.user.role,
        organizationId: challenge.user.organizationId,
        organizationDbName: challenge.user.organizationDbName,
      },
      jwtSecret,
      jwtSignOptions,
    );
    return {
      token,
      user: toSafeUser(challenge.user),
      rememberMe: challenge.rememberMe,
    };
  },

  async resendLoginOtp(challengeId: string): Promise<void> {
    cleanupExpiredChallenges();
    const challenge = otpChallenges.get(challengeId);
    if (!challenge) {
      throw new Error("OTP challenge expired. Please login again.");
    }
    const freshCode = generateOtpCode();
    challenge.otpCode = freshCode;
    challenge.expiresAt = Date.now() + challengeTtlMs;
    otpChallenges.set(challengeId, challenge);
    await emailService.sendOtpEmail(challenge.user.email, freshCode);
  },

  async signup(payload: SignupPayload): Promise<AuthResult> {
    const existing = await userModel.findByEmail(payload.email);
    if (existing) {
      throw new Error("Email already in use");
    }

    const newId = `u_${Date.now()}`;
    const passwordHash = await bcrypt.hash(payload.password, 10);
    userModel.create({
      id: newId,
      email: payload.email,
      passwordHash,
      fullName: `${payload.firstName} ${payload.lastName}`.trim(),
      role: "ORG_ADMIN",
      organizationId: `org_${payload.organizationName.toLowerCase().replace(/\s+/g, "_")}`,
      isActive: true,
      phone: "",
      language: "English",
      bio: "",
    });

    const token = jwt.sign({ sub: newId, role: "ORG_ADMIN" }, jwtSecret, jwtSignOptions);

    return {
      token,
      user: await toSafeUserFromMemory(newId),
    };
  },

  async verifyToken(token: string): Promise<SafeUser> {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded?.sub) {
      throw new Error("Invalid token");
    }

    if (decoded.role === "SUPER_ADMIN") {
      const superAdmin = await toSafeSuperAdmin(decoded.sub);
      if (!superAdmin.isActive) {
        throw new Error("User account is inactive");
      }
      return superAdmin;
    }

    const tenantUser = await findTenantUserById(
      decoded.sub,
      decoded.role,
      decoded.organizationDbName,
      decoded.organizationId,
    );
    if (!tenantUser) {
      throw new Error("User not found");
    }
    if (!tenantUser.isActive) {
      throw new Error("User account is inactive");
    }
    return tenantUser;
  },

  async validateInviteToken(token: string): Promise<{ email: string; organizationName: string; expiresAt: string }> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await dbPool.query(
      `SELECT i.user_email, o.name AS organization_name, i.expires_at
         FROM org_admin_invites i
         JOIN organizations o ON o.id = i.org_id
        WHERE i.token_hash = ?
          AND i.used_at IS NULL
          AND i.expires_at > NOW()
        LIMIT 1`,
      [tokenHash],
    );
    const row = (rows as Array<{ user_email: string; organization_name: string; expires_at: Date }>)[0];
    if (!row) {
      throw new Error("Invite is invalid or expired");
    }
    return {
      email: row.user_email,
      organizationName: row.organization_name,
      expiresAt: row.expires_at.toISOString(),
    };
  },

  async acceptInviteAndSetPassword(token: string, password: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT i.id, i.org_id, i.user_email, o.db_name
           FROM org_admin_invites i
           JOIN organizations o ON o.id = i.org_id
          WHERE i.token_hash = ?
            AND i.used_at IS NULL
            AND i.expires_at > NOW()
          LIMIT 1`,
        [tokenHash],
      );
      const invite = (rows as Array<{ id: string; org_id: string; user_email: string; db_name: string }>)[0];
      if (!invite) {
        throw new Error("Invite is invalid or expired");
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [updateResult] = await conn.query(
        `UPDATE \`${invite.db_name}\`.users
            SET password_hash = ?, status = 'active', updated_at = NOW()
          WHERE email = ? AND role = 'org_admin'
          LIMIT 1`,
        [passwordHash, invite.user_email],
      );
      if (Number((updateResult as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        throw new Error("Invite user was not found in organization.");
      }

      await conn.query(
        `UPDATE org_admin_invites
            SET used_at = NOW()
          WHERE id = ?`,
        [invite.id],
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
