import { dbPool } from "../config/db";
import { env } from "../config/env";

/**
 * Resolves the tenant database name for a given organization ID.
 *
 * @param organizationId - The org UUID stored on the authenticated user.
 * @throws If the organization is not found or has no db_name configured.
 */
export async function resolveTenantDbName(organizationId: string): Promise<string> {
  const [rows] = await dbPool.query(
    `SELECT db_name
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE id = ?
        AND db_name IS NOT NULL
        AND db_name <> ''
      LIMIT 1`,
    [organizationId],
  );
  const row = (rows as Array<{ db_name: string }>)[0];
  if (!row) {
    throw new Error(`Cannot resolve tenant DB for organization: ${organizationId}`);
  }
  return row.db_name;
}
