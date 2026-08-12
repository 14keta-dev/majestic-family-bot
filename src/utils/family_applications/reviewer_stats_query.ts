
import { applicationSchema } from "../db/schema";
import { db } from "../db";

export interface ReviewerStatsRow {
    applicationStatus: typeof applicationSchema.$inferSelect.applicationStatus;
    decisionMadeById: string | null;
}


export async function getReviewerApplications(dbInstance: typeof db = db): Promise<ReviewerStatsRow[]> {
    return dbInstance
        .select({
            applicationStatus: applicationSchema.applicationStatus,
            decisionMadeById: applicationSchema.decisionMadeById,
        })
        .from(applicationSchema);
}