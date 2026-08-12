
import { and, eq, gt } from "drizzle-orm";
import { applicationSchema } from "../db/schema";
import { db } from "../db"; 
import type { CooldownApplication } from "../../embed/family_applications/cooldown.embed";

export async function getActiveCooldownApplications(dbInstance: typeof db = db): Promise<CooldownApplication[]> {
    const now = new Date();
    return dbInstance
        .select({
            id: applicationSchema.id,
            applicantId: applicationSchema.applicantId,
            coolDownUntil: applicationSchema.coolDownUntil,
            archiveMessageId: applicationSchema.archiveMessageId,
        })
        .from(applicationSchema)
        .where(and(
            eq(applicationSchema.applicationStatus, "REJECTED"),
            gt(applicationSchema.coolDownUntil, now),
        ));
}