import type {
  ManualPlan,
  OrgAdmin,
  Organization,
  SubPlan,
  SuperAdminActivityLog,
  TopUpPlan,
} from "../types/superAdmin";
import type { SuperAdminDashboardSummary } from "../types/superAdminDashboard";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { PoolConnection } from "mysql2/promise";

const sanitizeOrgCode = (name: string): string => {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return cleaned || "org";
};

const sanitizeDbName = (orgCode: string): string => {
  const cleaned = orgCode.replace(/[^a-z0-9_]/g, "").slice(0, 24);
  return `org_${cleaned || "tenant"}`;
};

const toUiPlanType = (planType: string | null | undefined): Organization["planType"] => {
  if (!planType) {
    return "Subscription";
  }
  return planType.toLowerCase() === "manual" ? "Manual" : "Subscription";
};

const toManualDuration = (billingCycle: string | null | undefined): ManualPlan["duration"] => {
  if (!billingCycle) return "3 Months";
  const key = billingCycle.toLowerCase();
  if (key.includes("year")) return "1 Year";
  if (key.includes("6")) return "6 Months";
  return "3 Months";
};

const moduleToIcon = (module: SuperAdminActivityLog["module"]): string => {
  if (module === "Billing") return "ri-bank-card-line";
  if (module === "User") return "ri-user-line";
  if (module === "System") return "ri-settings-3-line";
  return "ri-building-2-line";
};

const moduleToColor = (module: SuperAdminActivityLog["module"]): string => {
  if (module === "Billing") return "#d97706";
  if (module === "User") return "#00c896";
  if (module === "System") return "#7c3aed";
  return "#0097B2";
};

const formatMoney = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `$${Math.round(safe).toLocaleString()}`;
};

const timeAgo = (createdAt: Date): string => {
  const now = Date.now();
  const t = createdAt.getTime();
  const diffMs = Math.max(0, now - t);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(diffMs / 86400000);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const dashboardIconForActivity = (module: string, action: string): {
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
} => {
  const a = action.toLowerCase();
  if (a.includes("deactiv")) {
    return { icon: "ri-close-circle-line", iconColorClass: "text-[#ef4444]", iconBgClass: "bg-[#ef4444]/10" };
  }
  if (a.includes("update") || a.includes("detail")) {
    return { icon: "ri-edit-line", iconColorClass: "text-[#16a34a]", iconBgClass: "bg-[#16a34a]/10" };
  }
  if (a.includes("manual") || a.includes("year")) {
    return { icon: "ri-bank-card-line", iconColorClass: "text-[#d97706]", iconBgClass: "bg-[#d97706]/10" };
  }
  if (a.includes("plan") || a.includes("upgrad") || module.toLowerCase() === "billing") {
    return { icon: "ri-repeat-line", iconColorClass: "text-[#00c896]", iconBgClass: "bg-[#00c896]/10" };
  }
  if (module.toLowerCase() === "organization") {
    return { icon: "ri-building-2-line", iconColorClass: "text-[#0097B2]", iconBgClass: "bg-[#0097B2]/10" };
  }
  return { icon: "ri-building-2-line", iconColorClass: "text-[#0097B2]", iconBgClass: "bg-[#0097B2]/10" };
};

const toTenantTableDDL = () => [
  `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('org_admin','user') NOT NULL DEFAULT 'user',
      status ENUM('active','inactive') NOT NULL DEFAULT 'inactive',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) NOT NULL,
      category_code VARCHAR(60) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NULL,
      document_count INT NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_categories_code (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS category_metadata_fields (
      id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36) NOT NULL,
      field_name VARCHAR(120) NOT NULL,
      field_type VARCHAR(40) NOT NULL,
      enum_options JSON NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_cmf_category (category_id),
      CONSTRAINT fk_cmf_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36) NOT NULL,
      uploaded_by VARCHAR(36) NOT NULL,
      doc_code VARCHAR(60) NOT NULL,
      name VARCHAR(200) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      ocr_text_path VARCHAR(512) NULL,
      ocr_status ENUM('none','pending','ready','failed') NOT NULL DEFAULT 'none',
      preview_page_count INT NOT NULL DEFAULT 0,
      file_type VARCHAR(40) NOT NULL,
      file_size_kb INT NOT NULL DEFAULT 0,
      page_count INT NOT NULL DEFAULT 0,
      visibility ENUM('Public','Private') NOT NULL DEFAULT 'Private',
      status ENUM('active','archived','deleted') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_documents_code (doc_code),
      KEY idx_documents_category (category_id),
      CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS document_metadata_values (
      id VARCHAR(36) NOT NULL,
      document_id VARCHAR(36) NOT NULL,
      field_id VARCHAR(36) NOT NULL,
      value TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_dmv_doc (document_id),
      KEY idx_dmv_field (field_id),
      CONSTRAINT fk_dmv_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      CONSTRAINT fk_dmv_field FOREIGN KEY (field_id) REFERENCES category_metadata_fields(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS org_activity_logs (
      id VARCHAR(36) NOT NULL,
      performed_by VARCHAR(36) NOT NULL,
      action VARCHAR(120) NOT NULL,
      module VARCHAR(80) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_oal_module (module),
      KEY idx_oal_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const ensureInviteTableSql = `
  CREATE TABLE IF NOT EXISTS \`${env.mysqlDatabase}\`.org_admin_invites (
    id VARCHAR(36) NOT NULL,
    org_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_org_admin_invites_token_hash (token_hash),
    KEY idx_org_admin_invites_org_id (org_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let organizationsSoftDeleteColumnEnsured = false;
let organizationsProfileColumnsEnsured = false;
let plansBillingCycleEnumValuesCache: string[] | null = null;

const parseEnumValues = (columnType: string): string[] => {
  const matches = [...columnType.matchAll(/'([^']+)'/g)];
  return matches.map((m) => m[1]).filter((v): v is string => typeof v === "string" && v.length > 0);
};

const getPlansBillingCycleEnumValues = async (): Promise<string[]> => {
  if (plansBillingCycleEnumValuesCache) {
    return plansBillingCycleEnumValuesCache;
  }
  const [rows] = await dbPool.query(
    `SELECT COLUMN_TYPE
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'plans'
        AND column_name = 'billing_cycle'
      LIMIT 1`,
    [env.mysqlDatabase],
  );
  const row = (rows as Array<{ COLUMN_TYPE?: string; column_type?: string }>)[0];
  const columnType = row?.COLUMN_TYPE ?? row?.column_type ?? "";
  const values = parseEnumValues(columnType);
  plansBillingCycleEnumValuesCache = values;
  return values;
};

const resolveManualBillingCycleValue = async (duration: ManualPlan["duration"]): Promise<string> => {
  const enumValues = await getPlansBillingCycleEnumValues();
  if (enumValues.length === 0) {
    return duration === "1 Year" ? "yearly" : duration === "6 Months" ? "semiannual" : "quarterly";
  }
  const normalizedMap = new Map(enumValues.map((v) => [v.toLowerCase(), v]));
  const candidatesByDuration: Record<ManualPlan["duration"], string[]> = {
    "3 Months": ["quarterly", "quarter", "3_months", "3months", "three_months"],
    "6 Months": ["semiannual", "semi_annual", "semi-annually", "semi_annually", "half_yearly", "6_months", "6months"],
    "1 Year": ["yearly", "annual", "annually", "1_year", "12_months"],
  };

  for (const candidate of candidatesByDuration[duration]) {
    const matched = normalizedMap.get(candidate);
    if (matched) return matched;
  }

  for (const value of enumValues) {
    const key = value.toLowerCase();
    if (duration === "1 Year" && (key.includes("year") || key.includes("annual") || key.includes("12"))) return value;
    if (duration === "6 Months" && (key.includes("semi") || key.includes("half") || key.includes("6"))) return value;
    if (duration === "3 Months" && (key.includes("quarter") || key.includes("3"))) return value;
  }

  return enumValues[0] ?? "quarterly";
};

const ensureOrganizationsSoftDeleteColumn = async (
  conn?: PoolConnection,
): Promise<void> => {
  if (organizationsSoftDeleteColumnEnsured) return;
  const runner = conn ?? dbPool;
  const [rows] = await runner.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'organizations'
        AND column_name = 'is_deleted'
      LIMIT 1`,
    [env.mysqlDatabase],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await runner.query(
      `ALTER TABLE organizations
         ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    );
  }
  organizationsSoftDeleteColumnEnsured = true;
};

const ensureOrganizationsProfileColumns = async (
  conn?: PoolConnection,
): Promise<void> => {
  if (organizationsProfileColumnsEnsured) return;
  const runner = conn ?? dbPool;
  const [rows] = await runner.query(
    `SELECT LOWER(column_name) AS column_name
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'organizations'
        AND column_name IN ('phone', 'address', 'industry')`,
    [env.mysqlDatabase],
  );
  const existing = new Set(
    (rows as Array<{ column_name?: string; COLUMN_NAME?: string }>)
      .map((r) => (r.column_name ?? r.COLUMN_NAME ?? "").toLowerCase())
      .filter(Boolean),
  );
  if (!existing.has("phone")) {
    await runner.query(`ALTER TABLE organizations ADD COLUMN phone VARCHAR(60) NULL`);
  }
  if (!existing.has("address")) {
    await runner.query(`ALTER TABLE organizations ADD COLUMN address VARCHAR(255) NULL`);
  }
  if (!existing.has("industry")) {
    await runner.query(`ALTER TABLE organizations ADD COLUMN industry VARCHAR(120) NULL`);
  }
  organizationsProfileColumnsEnsured = true;
};

const resolveAssignedBySuperAdminId = async (
  actorId: string | undefined,
  conn?: PoolConnection,
): Promise<string> => {
  const runner = conn ?? dbPool;
  if (actorId) {
    const [rows] = await runner.query(
      `SELECT id
         FROM \`${env.mysqlDatabase}\`.super_admins
        WHERE id = ?
        LIMIT 1`,
      [actorId],
    );
    const matched = (rows as Array<{ id: string }>)[0];
    if (matched?.id) {
      return matched.id;
    }
  }

  const [fallbackRows] = await runner.query(
    `SELECT id
       FROM \`${env.mysqlDatabase}\`.super_admins
      ORDER BY created_at ASC
      LIMIT 1`,
  );
  const fallback = (fallbackRows as Array<{ id: string }>)[0];
  if (!fallback?.id) {
    throw new Error("No super admin found to assign plan changes.");
  }
  return fallback.id;
};

const assertNoDuplicateOrgIdentity = async (input: {
  name: string | undefined;
  email: string | undefined;
  excludeOrgId: string | undefined;
  conn: PoolConnection | undefined;
}): Promise<void> => {
  const runner = input.conn ?? dbPool;
  const params: Array<string> = [];
  const checks: string[] = [];

  if (input.name && input.name.trim()) {
    checks.push("LOWER(name) = LOWER(?)");
    params.push(input.name.trim());
  }
  if (input.email && input.email.trim()) {
    checks.push("LOWER(email) = LOWER(?)");
    params.push(input.email.trim());
  }
  if (checks.length === 0) return;

  let sql = `
    SELECT id, name, email
      FROM organizations
     WHERE is_deleted = 0
       AND (${checks.join(" OR ")})
  `;
  if (input.excludeOrgId) {
    sql += " AND id <> ?";
    params.push(input.excludeOrgId);
  }
  sql += " LIMIT 20";

  const [rows] = await runner.query(sql, params);
  const conflicts = rows as Array<{ id: string; name: string; email: string }>;
  if (conflicts.length === 0) return;

  const hasNameConflict = Boolean(
    input.name && conflicts.some((c) => c.name.toLowerCase() === input.name!.trim().toLowerCase()),
  );
  if (hasNameConflict) {
    throw new Error("Organization name already exists");
  }

  const hasEmailConflict = Boolean(
    input.email && conflicts.some((c) => c.email.toLowerCase() === input.email!.trim().toLowerCase()),
  );
  if (hasEmailConflict) {
    throw new Error("Organization email already exists");
  }
};

const assertNoDuplicateAdminEmails = (admins: Array<Pick<OrgAdmin, "name" | "email">>): void => {
  const seen = new Set<string>();
  for (const admin of admins) {
    const email = (admin.email ?? "").trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) {
      throw new Error(`Duplicate admin email in request: ${email}`);
    }
    seen.add(email);
  }
};

const mapOrgRowToOrganization = (row: {
  id: string;
  name: string;
  email: string;
  status: string;
  doc_pages_used: number;
  doc_pages_limit: number;
  plan_type: string | null;
  plan_name: string | null;
  plan_expiry: string | Date | null;
  phone: string | null;
  address: string | null;
  industry: string | null;
  created_at: string | Date | null;
  db_name?: string | null;
}): Organization => {
  const status: Organization["status"] = row.status.toLowerCase() === "inactive" ? "Inactive" : "Active";
  const planType = toUiPlanType(row.plan_type);
  const planExpiry =
    row.plan_expiry instanceof Date
      ? row.plan_expiry.toISOString().slice(0, 10)
      : typeof row.plan_expiry === "string"
        ? row.plan_expiry.slice(0, 10)
        : "";
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdDate:
      row.created_at instanceof Date
        ? row.created_at.toISOString().slice(0, 10)
        : typeof row.created_at === "string"
          ? row.created_at.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
    status,
    planType,
    planName: row.plan_name ?? "Unassigned",
    planExpiry,
    industry: row.industry ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    adminCount: 0,
    admins: [],
    docUsed: row.doc_pages_used ?? 0,
    docTotal: row.doc_pages_limit ?? 0,
    billingHistory: [],
  };
};

export const superAdminModel = {
  // Organizations
  async getDashboardSummaryFromDb(): Promise<SuperAdminDashboardSummary> {
    await ensureOrganizationsSoftDeleteColumn();
    const [totalRows] = await dbPool.query(
      `SELECT COUNT(*) AS cnt FROM organizations WHERE is_deleted = 0`,
    );
    const totalOrganizations = Number((totalRows as Array<{ cnt: number } >)[0]?.cnt ?? 0);

    const [activeRows] = await dbPool.query(
      `SELECT COUNT(*) AS cnt FROM organizations WHERE is_deleted = 0 AND LOWER(status) = 'active'`,
    );
    const activeOrganizations = Number((activeRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);

    const inactiveOrganizations = Math.max(0, totalOrganizations - activeOrganizations);

    const [newOrgRows] = await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM organizations
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    );
    const newOrganizations = Number((newOrgRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);

    // Active plans counts
    const [planCountsRows] = await dbPool.query(
      `SELECT p.plan_type, COUNT(*) AS cnt
         FROM org_plan_subscriptions ops
         JOIN plans p ON p.id = ops.plan_id
        WHERE ops.status = 'active' AND p.is_active = 1
        GROUP BY p.plan_type`,
    );
    const countsByType = (planCountsRows as Array<{ plan_type: string; cnt: number }>);
    const subscriptionCount = Number(countsByType.find((r) => r.plan_type === "subscription")?.cnt ?? 0);
    const manualCount = Number(countsByType.find((r) => r.plan_type === "manual")?.cnt ?? 0);
    const activePlansTotal = subscriptionCount + manualCount;

    // Total revenue (simple): active subscription/manual plan price + top-up revenue
    const [subRevenueRows] = await dbPool.query(
      `SELECT COALESCE(SUM(p.price),0) AS revenue
         FROM org_plan_subscriptions ops
         JOIN plans p ON p.id = ops.plan_id
        WHERE ops.status = 'active' AND p.is_active = 1`,
    );
    const subscriptionAndManualRevenue = Number((subRevenueRows as Array<{ revenue: number }>)[0]?.revenue ?? 0);

    const [topupRevenueRows] = await dbPool.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS revenue
         FROM topup_purchases`,
    );
    const topupRevenue = Number((topupRevenueRows as Array<{ revenue: number }>)[0]?.revenue ?? 0);

    const totalRevenue = subscriptionAndManualRevenue + topupRevenue;

    // Revenue delta: top-up revenue in last 30 days
    const [topupRevenue30Rows] = await dbPool.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS revenue
         FROM topup_purchases
        WHERE purchased_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    );
    const topupRevenue30 = Number((topupRevenue30Rows as Array<{ revenue: number }>)[0]?.revenue ?? 0);

    const kpis: SuperAdminDashboardSummary["kpis"] = [
      {
        label: "Total Organizations",
        value: String(totalOrganizations),
        delta: `+${newOrganizations} this month`,
        icon: "ri-building-2-line",
        iconColorClass: "text-[#0097B2]",
        iconBgClass: "bg-[#0097B2]/10",
      },
      {
        label: "Active Organizations",
        value: String(activeOrganizations),
        delta: `${inactiveOrganizations} inactive`,
        icon: "ri-checkbox-circle-line",
        iconColorClass: "text-[#16a34a]",
        iconBgClass: "bg-[#16a34a]/10",
      },
      {
        label: "Total Revenue",
        value: formatMoney(totalRevenue),
        delta: `+${formatMoney(topupRevenue30)} this month`,
        icon: "ri-money-dollar-circle-line",
        iconColorClass: "text-[#d97706]",
        iconBgClass: "bg-[#d97706]/10",
      },
      {
        label: "Active Plans",
        value: String(activePlansTotal),
        delta: `${subscriptionCount} subscription · ${manualCount} manual`,
        icon: "ri-file-list-3-line",
        iconColorClass: "text-[#00c896]",
        iconBgClass: "bg-[#00c896]/10",
      },
    ];

    // Top-up stats
    // Since topup_purchases is empty initially, this will naturally return 0.
    const [topupCountsRows] = await dbPool.query(
      `SELECT p.plan_type, COUNT(*) AS cnt
         FROM topup_purchases tp
         JOIN org_plan_subscriptions ops ON ops.org_id = tp.org_id AND ops.status = 'active'
         JOIN plans p ON p.id = ops.plan_id
        WHERE p.is_active = 1
        GROUP BY p.plan_type`,
    );
    const countsByPlanType = topupCountsRows as Array<{ plan_type: string; cnt: number }>;
    const manualTopupCount = Number(countsByPlanType.find((r) => r.plan_type === "manual")?.cnt ?? 0);
    const subTopupCount = Number(countsByPlanType.find((r) => r.plan_type === "subscription")?.cnt ?? 0);

    const [topupRevenueTotalRows] = await dbPool.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS revenue FROM topup_purchases`,
    );
    const topupRevenueTotal = Number((topupRevenueTotalRows as Array<{ revenue: number }>)[0]?.revenue ?? 0);

    const topupStats: SuperAdminDashboardSummary["topupStats"] = [
      {
        label: "Top-Up Requests (Manual)",
        value: String(manualTopupCount),
        icon: "ri-file-add-line",
        iconColorClass: "text-[#d97706]",
        iconBgClass: "bg-[#d97706]/10",
      },
      {
        label: "Top-Up Purchases (Sub)",
        value: String(subTopupCount),
        icon: "ri-shopping-cart-line",
        iconColorClass: "text-[#00c896]",
        iconBgClass: "bg-[#00c896]/10",
      },
      {
        label: "Top-Up Revenue",
        value: formatMoney(topupRevenueTotal),
        icon: "ri-coins-line",
        iconColorClass: "text-[#0097B2]",
        iconBgClass: "bg-[#0097B2]/10",
      },
    ];

    // Recent activity (last 5 platform actions)
    const [activityRows] = await dbPool.query(
      `SELECT pal.action, pal.module, pal.details, pal.created_at, 
              COALESCE(o.name,'System') AS org_name,
              COALESCE(sa.name,'System') AS admin_name
         FROM platform_activity_logs pal
         LEFT JOIN organizations o ON o.id = pal.org_id
         LEFT JOIN super_admins sa ON sa.id = pal.performed_by
        ORDER BY pal.created_at DESC
        LIMIT 5`,
    );

    const recentActivity: SuperAdminDashboardSummary["recentActivity"] = (activityRows as Array<{
      action: string;
      module: string;
      details: string | null;
      created_at: Date;
      org_name: string;
      admin_name: string;
    }>).map((row) => {
      const iconPack = dashboardIconForActivity(row.module, row.action);
      return {
        icon: iconPack.icon,
        iconColorClass: iconPack.iconColorClass,
        iconBgClass: iconPack.iconBgClass,
        action: row.action,
        org: row.org_name,
        time: timeAgo(new Date(row.created_at)),
        admin: row.admin_name,
      };
    });

    return { kpis, topupStats, recentActivity };
  },
  async listOrganizationsFromDb(query: {
    search: string | undefined;
    status: string | undefined;
    planType: string | undefined;
  }): Promise<Organization[]> {
    await ensureOrganizationsSoftDeleteColumn();
    await ensureOrganizationsProfileColumns();
    const conditions: string[] = [];
    const params: Array<string> = [];

    conditions.push("o.is_deleted = 0");

    if (query.search) {
      conditions.push("(o.name LIKE ? OR o.email LIKE ?)");
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    if (query.status && query.status !== "All") {
      conditions.push("LOWER(o.status) = ?");
      params.push(query.status.toLowerCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await dbPool.query(
      `SELECT
          o.id,
          o.name,
          o.email,
          o.status,
          o.doc_pages_used,
          o.doc_pages_limit,
          o.phone,
          o.address,
          o.industry,
          o.created_at,
          p.plan_type,
          p.name AS plan_name,
          ops.end_date AS plan_expiry
       FROM organizations o
       LEFT JOIN (
         SELECT org_id, MAX(start_date) AS latest_start
         FROM org_plan_subscriptions
         GROUP BY org_id
       ) latest ON latest.org_id = o.id
       LEFT JOIN org_plan_subscriptions ops
         ON ops.org_id = latest.org_id
        AND ops.start_date = latest.latest_start
       LEFT JOIN plans p ON p.id = ops.plan_id
       ${whereClause}
       ORDER BY o.name ASC`,
      params,
    );

    return (rows as Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      doc_pages_used: number;
      doc_pages_limit: number;
      phone: string | null;
      address: string | null;
      industry: string | null;
      created_at: string | Date | null;
      plan_type: string | null;
      plan_name: string | null;
      plan_expiry: string | Date | null;
    }>)
      .map((row) => mapOrgRowToOrganization(row))
      .filter((org) => !query.planType || query.planType === "All" || org.planType === query.planType);
  },
  async findOrganizationIdByName(name: string): Promise<string | null> {
    await ensureOrganizationsSoftDeleteColumn();
    const [rows] = await dbPool.query(
      `SELECT id FROM organizations WHERE name = ? AND is_deleted = 0 LIMIT 1`,
      [name],
    );
    const row = (rows as Array<{ id: string }>)[0];
    return row?.id ?? null;
  },
  async getOrganizationByIdFromDb(id: string): Promise<Organization | null> {
    await ensureOrganizationsSoftDeleteColumn();
    await ensureOrganizationsProfileColumns();
    const [rows] = await dbPool.query(
      `SELECT
          o.id, o.name, o.email, o.status, o.doc_pages_used, o.doc_pages_limit, o.phone, o.address, o.industry, o.created_at, o.db_name,
          p.plan_type, p.name AS plan_name, ops.end_date AS plan_expiry
       FROM organizations o
       LEFT JOIN (
         SELECT org_id, MAX(start_date) AS latest_start
         FROM org_plan_subscriptions
         GROUP BY org_id
       ) latest ON latest.org_id = o.id
       LEFT JOIN org_plan_subscriptions ops
         ON ops.org_id = latest.org_id
        AND ops.start_date = latest.latest_start
       LEFT JOIN plans p ON p.id = ops.plan_id
       WHERE o.id = ?
         AND o.is_deleted = 0
       LIMIT 1`,
      [id],
    );
    const row = (rows as Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      doc_pages_used: number;
      doc_pages_limit: number;
      phone: string | null;
      address: string | null;
      industry: string | null;
      created_at: string | Date | null;
      db_name: string | null;
      plan_type: string | null;
      plan_name: string | null;
      plan_expiry: string | Date | null;
    }>)[0];
    if (!row) return null;

    const org = mapOrgRowToOrganization(row);
    const dbName = row.db_name ?? "";
    if (!dbName) return org;

    try {
      const [adminRows] = await dbPool.query(
        `SELECT id, name, email, status
           FROM \`${dbName}\`.users
          WHERE role = 'org_admin'
          ORDER BY created_at ASC`,
      );
      const admins = (adminRows as Array<{ id: string; name: string; email: string; status: string }>).map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: "Admin",
        status: a.status.toLowerCase() === "active" ? "Active" : "Inactive",
      })) as OrgAdmin[];
      org.admins = admins;
      org.adminCount = admins.length;
    } catch {
      // If tenant DB is unavailable, still return base org details.
      org.admins = [];
      org.adminCount = 0;
    }

    return org;
  },
  async updateOrganizationInDb(
    id: string,
    payload: Partial<Pick<Organization, "name" | "email" | "phone" | "address" | "industry">>,
  ): Promise<boolean> {
    await ensureOrganizationsSoftDeleteColumn();
    await ensureOrganizationsProfileColumns();
    await assertNoDuplicateOrgIdentity({
      name: payload.name,
      email: payload.email,
      excludeOrgId: id,
      conn: undefined,
    });
    const updates: string[] = [];
    const params: Array<string> = [];
    if (payload.name !== undefined) { updates.push("name = ?"); params.push(payload.name); }
    if (payload.email !== undefined) { updates.push("email = ?"); params.push(payload.email); }
    if (payload.phone !== undefined) { updates.push("phone = ?"); params.push(payload.phone); }
    if (payload.address !== undefined) { updates.push("address = ?"); params.push(payload.address); }
    if (payload.industry !== undefined) { updates.push("industry = ?"); params.push(payload.industry); }
    if (updates.length === 0) return true;
    params.push(id);
    const [result] = await dbPool.query(`UPDATE organizations SET ${updates.join(", ")} WHERE id = ? AND is_deleted = 0`, params);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async updateOrganizationPlanInDb(
    id: string,
    payload: { planName: string | undefined; planExpiry: string | undefined; actorId?: string },
  ): Promise<void> {
    if (!payload.planName && payload.planExpiry === undefined) return;
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();

      const [currentRows] = await conn.query(
        `SELECT id, plan_id
           FROM org_plan_subscriptions
          WHERE org_id = ?
          ORDER BY start_date DESC
          LIMIT 1`,
        [id],
      );
      const current = (currentRows as Array<{ id: string; plan_id: string }>)[0];

      let planId = current?.plan_id ?? "";
      if (payload.planName) {
        const [planRows] = await conn.query(
          `SELECT id FROM plans WHERE name = ? AND is_active = 1 LIMIT 1`,
          [payload.planName],
        );
        const matched = (planRows as Array<{ id: string }>)[0];
        if (matched?.id) {
          planId = matched.id;
        }
      }

      if (!planId) {
        await conn.commit();
        return;
      }

      const expiry = payload.planExpiry && payload.planExpiry.trim().length > 0 ? payload.planExpiry : null;
      const assignedBy = await resolveAssignedBySuperAdminId(payload.actorId, conn);

      if (!current) {
        await conn.query(
          `INSERT INTO org_plan_subscriptions
            (id, org_id, plan_id, status, start_date, end_date, assigned_by)
           VALUES (?, ?, ?, 'active', NOW(), ?, ?)`,
          [crypto.randomUUID(), id, planId, expiry, assignedBy],
        );
      } else {
        await conn.query(
          `UPDATE org_plan_subscriptions
              SET plan_id = ?,
                  end_date = ?,
                  assigned_by = ?
            WHERE id = ?`,
          [planId, expiry, assignedBy, current.id],
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  async syncOrganizationAdminsInDb(input: {
    orgId: string;
    actorId: string;
    admins: Array<Pick<OrgAdmin, "id" | "name" | "email">>;
  }): Promise<Array<{ email: string; name: string; token: string }>> {
    assertNoDuplicateAdminEmails(input.admins);
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();

      const [orgRows] = await conn.query(
        `SELECT db_name
           FROM \`${env.mysqlDatabase}\`.organizations
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [input.orgId],
      );
      const org = (orgRows as Array<{ db_name: string | null }>)[0];
      if (!org?.db_name) {
        await conn.commit();
        return [];
      }
      const dbName = org.db_name;

      const desiredAdmins = input.admins
        .map((a) => ({
          id: (a.id ?? "").trim(),
          name: (a.name ?? "").trim(),
          email: (a.email ?? "").trim().toLowerCase(),
        }))
        .filter((a) => a.name && a.email);

      const [existingRows] = await conn.query(
        `SELECT id, email
           FROM \`${dbName}\`.users
          WHERE role = 'org_admin'`,
      );
      const existing = (existingRows as Array<{ id: string; email: string }>).map((r) => ({
        id: r.id,
        email: (r.email ?? "").toLowerCase(),
      }));
      const existingById = new Map(existing.map((e) => [e.id, e]));
      const existingByEmail = new Map(existing.map((e) => [e.email, e]));

      const keepIds = new Set<string>();
      const invites: Array<{ email: string; name: string; token: string }> = [];
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

      await conn.query(ensureInviteTableSql);

      for (const admin of desiredAdmins) {
        const matched = existingById.get(admin.id) ?? existingByEmail.get(admin.email);
        if (matched) {
          keepIds.add(matched.id);
          await conn.query(
            `UPDATE \`${dbName}\`.users
                SET name = ?,
                    email = ?,
                    role = 'org_admin',
                    status = 'active',
                    updated_at = NOW()
              WHERE id = ?`,
            [admin.name, admin.email, matched.id],
          );
          continue;
        }

        const userId = crypto.randomUUID();
        await conn.query(
          `INSERT INTO \`${dbName}\`.users (id, name, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, 'org_admin', 'inactive')`,
          [userId, admin.name, admin.email, placeholderHash],
        );
        keepIds.add(userId);

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        await conn.query(
          `INSERT INTO \`${env.mysqlDatabase}\`.org_admin_invites
            (id, org_id, user_email, user_name, token_hash, expires_at, created_by)
           VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE), ?)`,
          [crypto.randomUUID(), input.orgId, admin.email, admin.name, tokenHash, input.actorId],
        );
        invites.push({ email: admin.email, name: admin.name, token });
      }

      for (const e of existing) {
        if (!keepIds.has(e.id)) {
          await conn.query(
            `UPDATE \`${dbName}\`.users
                SET status = 'inactive',
                    updated_at = NOW()
              WHERE id = ?`,
            [e.id],
          );
        }
      }

      await conn.commit();
      return invites;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  async updateOrganizationStatusInDb(id: string, status: "Active" | "Inactive"): Promise<boolean> {
    await ensureOrganizationsSoftDeleteColumn();
    const dbStatus = status === "Active" ? "active" : "inactive";
    const [result] = await dbPool.query(`UPDATE organizations SET status = ? WHERE id = ? AND is_deleted = 0`, [dbStatus, id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async deleteOrganizationInDb(id: string): Promise<boolean> {
    await ensureOrganizationsSoftDeleteColumn();
    const [result] = await dbPool.query(
      `UPDATE organizations
          SET is_deleted = 1,
              status = 'inactive'
        WHERE id = ?
          AND is_deleted = 0`,
      [id],
    );
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  // Billing
  async listBillingFromDb(): Promise<{
    manualPlans: ManualPlan[];
    subscriptionPlans: SubPlan[];
    topUpPlans: TopUpPlan[];
  }> {
    const [manualRows] = await dbPool.query(
      `SELECT
          p.id,
          p.name,
          p.billing_cycle,
          p.price,
          p.doc_pages_limit,
          COUNT(DISTINCT ops.org_id) AS orgsCount
       FROM plans p
       LEFT JOIN org_plan_subscriptions ops ON ops.plan_id = p.id AND ops.status = 'active'
       WHERE p.plan_type = 'manual' AND p.is_active = 1
       GROUP BY p.id, p.name, p.billing_cycle, p.price, p.doc_pages_limit
       ORDER BY p.name ASC`,
    );

    const [subscriptionRows] = await dbPool.query(
      `SELECT
          p.id,
          p.name,
          p.price,
          p.doc_pages_limit,
          COUNT(DISTINCT ops.org_id) AS orgsCount
       FROM plans p
       LEFT JOIN org_plan_subscriptions ops ON ops.plan_id = p.id AND ops.status = 'active'
       WHERE p.plan_type = 'subscription' AND p.is_active = 1
       GROUP BY p.id, p.name, p.price, p.doc_pages_limit
       ORDER BY p.name ASC`,
    );

    const [topupRows] = await dbPool.query(
      `SELECT
          tp.id,
          tp.name,
          tp.pages_added,
          tp.price,
          COUNT(tpch.id) AS usageCount
       FROM topup_plans tp
       LEFT JOIN topup_purchases tpch ON tpch.topup_plan_id = tp.id
       WHERE tp.is_active = 1
       GROUP BY tp.id, tp.name, tp.pages_added, tp.price
       ORDER BY tp.name ASC`,
    );

    return {
      manualPlans: (manualRows as Array<{
        id: string;
        name: string;
        billing_cycle: string;
        price: number;
        doc_pages_limit: number;
        orgsCount: number;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        duration: toManualDuration(row.billing_cycle),
        price: Number(row.price),
        pageCount: Number(row.doc_pages_limit ?? 0),
        orgsCount: Number(row.orgsCount ?? 0),
      })),
      subscriptionPlans: (subscriptionRows as Array<{
        id: string;
        name: string;
        price: number;
        doc_pages_limit: number;
        orgsCount: number;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        monthlyPrice: Number(row.price),
        monthlyPageLimit: Number(row.doc_pages_limit ?? 0),
        features: [],
        orgsCount: Number(row.orgsCount ?? 0),
      })),
      topUpPlans: (topupRows as Array<{
        id: string;
        name: string;
        pages_added: number;
        price: number;
        usageCount: number;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        pages: Number(row.pages_added ?? 0),
        price: Number(row.price),
        usageCount: Number(row.usageCount ?? 0),
      })),
    };
  },
  async createManualPlanInDb(payload: Omit<ManualPlan, "id" | "orgsCount">): Promise<ManualPlan> {
    const id = crypto.randomUUID();
    const billingCycle = await resolveManualBillingCycleValue(payload.duration);
    await dbPool.query(
      `INSERT INTO plans (id, name, plan_type, billing_cycle, price, doc_pages_limit, storage_limit_gb, is_active)
       VALUES (?, ?, 'manual', ?, ?, ?, ?, 1)`,
      [id, payload.name, billingCycle, payload.price, payload.pageCount, 100],
    );
    return { id, ...payload, orgsCount: 0 };
  },
  async createSubPlanInDb(payload: Omit<SubPlan, "id" | "orgsCount">): Promise<SubPlan> {
    const id = crypto.randomUUID();
    await dbPool.query(
      `INSERT INTO plans (id, name, plan_type, billing_cycle, price, doc_pages_limit, storage_limit_gb, is_active)
       VALUES (?, ?, 'subscription', 'monthly', ?, ?, ?, 1)`,
      [id, payload.name, payload.monthlyPrice, payload.monthlyPageLimit, 100],
    );
    return { id, ...payload, orgsCount: 0 };
  },
  async createTopUpPlanInDb(payload: Omit<TopUpPlan, "id" | "usageCount">): Promise<TopUpPlan> {
    const id = crypto.randomUUID();
    await dbPool.query(
      `INSERT INTO topup_plans (id, name, pages_added, price, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [id, payload.name, payload.pages, payload.price],
    );
    return { id, ...payload, usageCount: 0 };
  },
  async updateManualPlanInDb(id: string, payload: Partial<ManualPlan>): Promise<boolean> {
    const updates: string[] = [];
    const params: Array<string | number> = [];
    if (payload.name !== undefined) { updates.push("name = ?"); params.push(payload.name); }
    if (payload.duration !== undefined) {
      const billingCycle = await resolveManualBillingCycleValue(payload.duration);
      updates.push("billing_cycle = ?");
      params.push(billingCycle);
    }
    if (payload.price !== undefined) { updates.push("price = ?"); params.push(payload.price); }
    if (payload.pageCount !== undefined) { updates.push("doc_pages_limit = ?"); params.push(payload.pageCount); }
    if (updates.length === 0) return true;
    params.push(id);
    const [result] = await dbPool.query(`UPDATE plans SET ${updates.join(", ")} WHERE id = ? AND plan_type = 'manual'`, params);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async updateSubPlanInDb(id: string, payload: Partial<SubPlan>): Promise<boolean> {
    const updates: string[] = [];
    const params: Array<string | number> = [];
    if (payload.name !== undefined) { updates.push("name = ?"); params.push(payload.name); }
    if (payload.monthlyPrice !== undefined) { updates.push("price = ?"); params.push(payload.monthlyPrice); }
    if (payload.monthlyPageLimit !== undefined) { updates.push("doc_pages_limit = ?"); params.push(payload.monthlyPageLimit); }
    if (updates.length === 0) return true;
    params.push(id);
    const [result] = await dbPool.query(`UPDATE plans SET ${updates.join(", ")} WHERE id = ? AND plan_type = 'subscription'`, params);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async updateTopUpPlanInDb(id: string, payload: Partial<TopUpPlan>): Promise<boolean> {
    const updates: string[] = [];
    const params: Array<string | number> = [];
    if (payload.name !== undefined) { updates.push("name = ?"); params.push(payload.name); }
    if (payload.pages !== undefined) { updates.push("pages_added = ?"); params.push(payload.pages); }
    if (payload.price !== undefined) { updates.push("price = ?"); params.push(payload.price); }
    if (updates.length === 0) return true;
    params.push(id);
    const [result] = await dbPool.query(`UPDATE topup_plans SET ${updates.join(", ")} WHERE id = ?`, params);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async deleteManualPlanInDb(id: string): Promise<boolean> {
    const [result] = await dbPool.query(`UPDATE plans SET is_active = 0 WHERE id = ? AND plan_type = 'manual'`, [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async deleteSubPlanInDb(id: string): Promise<boolean> {
    const [result] = await dbPool.query(`UPDATE plans SET is_active = 0 WHERE id = ? AND plan_type = 'subscription'`, [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  async deleteTopUpPlanInDb(id: string): Promise<boolean> {
    const [result] = await dbPool.query(`UPDATE topup_plans SET is_active = 0 WHERE id = ?`, [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
  // Activity
  async listActivityLogsFromDb(query: {
    search: string | undefined;
    module: string | undefined;
    performedBy: string | undefined;
    organization: string | undefined;
  }): Promise<SuperAdminActivityLog[]> {
    const conditions: string[] = [];
    const params: string[] = [];

    if (query.search) {
      conditions.push("(pal.action LIKE ? OR pal.details LIKE ? OR COALESCE(o.name, 'System') LIKE ?)");
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }
    if (query.module && query.module !== "All") {
      conditions.push("pal.module = ?");
      params.push(query.module);
    }
    if (query.performedBy && query.performedBy !== "All") {
      conditions.push("sa.name = ?");
      params.push(query.performedBy);
    }
    if (query.organization && query.organization !== "All") {
      conditions.push("COALESCE(o.name, 'System') = ?");
      params.push(query.organization);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await dbPool.query(
      `SELECT
         pal.id,
         DATE_FORMAT(pal.created_at, '%Y-%m-%d %H:%i') AS dateTime,
         pal.action,
         pal.module,
         COALESCE(o.name, 'System') AS organization,
         COALESCE(sa.name, 'Unknown') AS performedBy,
         COALESCE(pal.details, '') AS details
       FROM platform_activity_logs pal
       LEFT JOIN organizations o ON o.id = pal.org_id
       LEFT JOIN super_admins sa ON sa.id = pal.performed_by
       ${whereClause}
       ORDER BY pal.created_at DESC`,
      params,
    );

    return (rows as Array<{
      id: string;
      dateTime: string;
      action: string;
      module: string;
      organization: string;
      performedBy: string;
      details: string;
    }>).map((row) => {
      const module = (["Organization", "Billing", "User", "System"].includes(row.module)
        ? row.module
        : "System") as SuperAdminActivityLog["module"];
      return {
        id: row.id,
        dateTime: row.dateTime,
        action: row.action,
        module,
        organization: row.organization,
        performedBy: row.performedBy,
        details: row.details,
        icon: moduleToIcon(module),
        color: moduleToColor(module),
      };
    });
  },
  async createActivityLogInDb(payload: {
    performedBy: string;
    orgId: string | null;
    action: string;
    module: SuperAdminActivityLog["module"];
    details: string;
  }): Promise<void> {
    await dbPool.query(
      `INSERT INTO platform_activity_logs (id, performed_by, org_id, action, module, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), payload.performedBy, payload.orgId, payload.action, payload.module, payload.details],
    );
  },
  async createOrganizationWithTenantProvisioning(input: {
    actorId: string;
    name: string;
    email: string;
    industry?: string;
    phone?: string;
    address?: string;
    planType?: "Manual" | "Subscription";
    planName?: string;
    planExpiry?: string;
    admins?: Array<Pick<OrgAdmin, "name" | "email">>;
  }): Promise<{
    organization: Organization;
    invites: Array<{ email: string; name: string; token: string }>;
  }> {
    assertNoDuplicateAdminEmails(input.admins ?? []);
    const conn = await dbPool.getConnection();
    const orgCodeBase = sanitizeOrgCode(input.name);
    let dbName = "";
    let orgId = "";

    try {
      await conn.beginTransaction();
      await ensureOrganizationsSoftDeleteColumn(conn);
      await ensureOrganizationsProfileColumns(conn);
      await assertNoDuplicateOrgIdentity({
        name: input.name,
        email: input.email,
        excludeOrgId: undefined,
        conn,
      });

      const [codeRows] = await conn.query(
        "SELECT org_code FROM organizations WHERE org_code LIKE ? AND is_deleted = 0",
        [`${orgCodeBase}%`],
      );
      const existingCodes = new Set((codeRows as Array<{ org_code: string }>).map((row) => row.org_code));
      let orgCodeCandidate = orgCodeBase;
      let suffix = 1;
      while (existingCodes.has(orgCodeCandidate)) {
        suffix += 1;
        orgCodeCandidate = `${orgCodeBase}${suffix}`;
      }

      orgId = crypto.randomUUID();
      dbName = sanitizeDbName(orgCodeCandidate);

      await conn.query(
        `INSERT INTO organizations
          (id, org_code, name, email, phone, address, industry, status, db_name, doc_pages_used, doc_pages_limit, storage_used_gb, storage_limit_gb)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, 10000, 0, 100)`,
        [orgId, orgCodeCandidate, input.name, input.email, input.phone ?? null, input.address ?? null, input.industry ?? null, dbName],
      );

      if (input.planName) {
        const [planRows] = await conn.query(
          `SELECT id FROM plans WHERE name = ? LIMIT 1`,
          [input.planName],
        );
        const matchedPlan = (planRows as Array<{ id: string }>)[0];
        if (matchedPlan?.id) {
          await conn.query(
            `INSERT INTO org_plan_subscriptions
              (id, org_id, plan_id, status, start_date, end_date, assigned_by)
             VALUES (?, ?, ?, 'active', CURDATE(), ?, ?)`,
            [
              crypto.randomUUID(),
              orgId,
              matchedPlan.id,
              input.planExpiry || null,
              input.actorId,
            ],
          );
        }
      }

      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.query(`USE \`${dbName}\``);
      for (const ddl of toTenantTableDDL()) {
        await conn.query(ddl);
      }

      const providedAdmins = (input.admins ?? [])
        .map((a) => ({ name: a.name?.trim?.() ?? "", email: a.email?.trim?.().toLowerCase?.() ?? "" }))
        .filter((a) => a.name && a.email);
      const createdInvites: Array<{ email: string; name: string; token: string }> = [];

      if (providedAdmins.length > 0) {
        const placeholderHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

        for (const admin of providedAdmins) {
          await conn.query(
            `INSERT INTO users (id, name, email, password_hash, role, status)
             VALUES (?, ?, ?, ?, 'org_admin', 'active')
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               role = 'org_admin',
               status = 'inactive'`,
            [crypto.randomUUID(), admin.name, admin.email, placeholderHash],
          );
        }

        await conn.query(ensureInviteTableSql);

        for (const admin of providedAdmins) {
          const token = crypto.randomBytes(32).toString("hex");
          const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
          await conn.query(
            `INSERT INTO \`${env.mysqlDatabase}\`.org_admin_invites
              (id, org_id, user_email, user_name, token_hash, expires_at, created_by)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE), ?)`,
            [crypto.randomUUID(), orgId, admin.email, admin.name, tokenHash, input.actorId],
          );
          createdInvites.push({ email: admin.email, name: admin.name, token });
        }
      }

      await conn.query(
        `INSERT INTO \`${env.mysqlDatabase}\`.platform_activity_logs (id, performed_by, org_id, action, module, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          input.actorId,
          orgId,
          "Organization Created",
          "Organization",
          `Provisioned tenant database ${dbName}`,
        ],
      );

      if ((input.admins ?? []).length > 0) {
        await conn.query(
          `INSERT INTO \`${env.mysqlDatabase}\`.platform_activity_logs (id, performed_by, org_id, action, module, details)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            input.actorId,
            orgId,
            "Org Admins Added",
            "User",
            `Added ${providedAdmins.length} org admin(s) to tenant database ${dbName}`,
          ],
        );
      }

      await conn.commit();

      return {
        organization: {
          id: orgId,
          name: input.name,
          email: input.email,
          createdDate: new Date().toISOString().slice(0, 10),
          status: "Active",
          planType: input.planType ?? "Subscription",
          planName: input.planName ?? "Starter",
          planExpiry: input.planExpiry ?? "",
          industry: input.industry ?? "",
          phone: input.phone ?? "",
          address: input.address ?? "",
          adminCount: providedAdmins.length,
          admins: providedAdmins.map((a) => ({
            id: crypto.randomUUID(),
            name: a.name,
            email: a.email,
            role: "Admin",
            status: "Inactive",
          })),
          docUsed: 0,
          docTotal: 10000,
          billingHistory: [],
        },
        invites: createdInvites,
      };
    } catch (error) {
      await conn.rollback();
      if (dbName) {
        try {
          await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        } catch {
          // Ignore cleanup errors to preserve root cause.
        }
      }
      throw error;
    } finally {
      try {
        await conn.query(`USE \`${env.mysqlDatabase}\``);
      } catch {
        // Best effort reset before returning connection to pool.
      }
      conn.release();
    }
  },
};
