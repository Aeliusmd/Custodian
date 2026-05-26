import cron from "node-cron";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { notifyOrgAdmin } from "./notificationService";

/**
 * Queries weekly stats for a given tenant DB:
 * - total active documents
 * - documents uploaded in the last 7 days
 * - active users
 */
async function getWeeklyStats(dbName: string): Promise<{
  totalDocuments: number;
  uploadsThisWeek: number;
  activeUsers: number;
}> {
  const [[docRows], [uploadRows], [userRows]] = await Promise.all([
    dbPool.query(`SELECT COUNT(*) AS total FROM \`${dbName}\`.documents WHERE status = 'active'`),
    dbPool.query(`SELECT COUNT(*) AS cnt FROM \`${dbName}\`.documents WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`),
    dbPool.query(`SELECT COUNT(*) AS cnt FROM \`${dbName}\`.users WHERE status = 'active'`),
  ]);

  return {
    totalDocuments: Number((docRows as Array<{ total: number }>)[0]?.total ?? 0),
    uploadsThisWeek: Number((uploadRows as Array<{ cnt: number }>)[0]?.cnt ?? 0),
    activeUsers: Number((userRows as Array<{ cnt: number }>)[0]?.cnt ?? 0),
  };
}

async function runWeeklyReports(): Promise<void> {
  console.log("[weekly-report] Running weekly report job…");
  try {
    const [orgRows] = await dbPool.query(
      `SELECT id, db_name FROM \`${env.mysqlDatabase}\`.organizations WHERE is_deleted = 0 AND db_name IS NOT NULL AND db_name <> ''`,
    );
    const orgs = orgRows as Array<{ id: string; db_name: string }>;

    for (const org of orgs) {
      try {
        const stats = await getWeeklyStats(org.db_name);
        await notifyOrgAdmin(org.id, "weekly_reports", {
          totalDocuments: stats.totalDocuments,
          uploadsThisWeek: stats.uploadsThisWeek,
          activeUsers: stats.activeUsers,
        });
      } catch (err) {
        console.error(`[weekly-report] Failed for org ${org.id}:`, err);
      }
    }

    console.log(`[weekly-report] Sent reports for ${orgs.length} organisation(s)`);
  } catch (err) {
    console.error("[weekly-report] Job failed:", err);
  }
}

export function startWeeklyReportScheduler(): void {
  // Runs every Sunday at 07:00 (server local time)
  cron.schedule("0 7 * * 0", () => {
    void runWeeklyReports();
  });
  console.log("[weekly-report] Scheduler registered — fires every Sunday at 07:00");
}
