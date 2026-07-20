import { eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { siteSettings } from "./schema";

export async function readSiteCopy() {
  return getDb().select({
    copyJson: siteSettings.copyJson,
    updatedAt: siteSettings.updatedAt,
  }).from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .get();
}

export async function writeSiteCopy(copyJson: string, email: string) {
  return getDb().insert(siteSettings).values({
    id: 1,
    copyJson,
    updatedBy: email,
  }).onConflictDoUpdate({
    target: siteSettings.id,
    set: {
      copyJson,
      updatedBy: email,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  }).returning({ updatedAt: siteSettings.updatedAt })
    .get();
}
