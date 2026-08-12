
import { applicationSchema } from "../db/schema";
import { db } from "../db";

export interface ManageSummaryRow {
    applicationStatus: typeof applicationSchema.$inferSelect.applicationStatus;
}


export async function getManageSummaryApplications(dbInstance: typeof db = db): Promise<ManageSummaryRow[]> {
    return dbInstance.select({ applicationStatus: applicationSchema.applicationStatus }).from(applicationSchema);
}