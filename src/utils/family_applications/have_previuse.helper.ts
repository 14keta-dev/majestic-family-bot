import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { applicationSchema } from "../db/schema";
import { log } from "../logger";

export default async function have_previuse(userId: string) {
    if (!userId) return [];

    try {
        const previuse_applications = await db
            .select()
            .from(applicationSchema)
            .where(
                and(
                    eq(applicationSchema.applicantId, userId),
                    inArray(applicationSchema.applicationStatus, ["ACCEPTED", "REJECTED"]),
                ),
            );

        return previuse_applications;
    } catch (error) {
        log.db.error(`Failed to fetch previous applications for user ${userId}: ${error}`);
        return [];
    }
}