import { pgEnum, pgTable, varchar, timestamp, json, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

/**
 OPEN = Every applications gets status open on submittion
 TAKEN = When reviwer press "take button" get auto claimed by the reviwer and no one except admin can interact
 ACCEPT = Application got accepted by reiwer
 Rejected = Application got rejected by reviwer
 **/
export const applicationStatusEnum = pgEnum("application_status_enum", [
    "OPEN",
    "TAKEN",
    "ACCEPTED",
    "REJECTED",
]);

export const applicationSchema = pgTable(
    "application_schema",
    {
        id: varchar("id", { length: 10 }).primaryKey().$defaultFn(() => nanoid(10)),

        applicantId: varchar("applicant_id", { length: 20 }).notNull(),

        // References ApplyType.id from config (e.g. "easy" / "hard") — not
        // a DB FK, see note above. Kept as plain varchar so config changes
        // don't require a schema migration.
        applicationType: varchar("application_type", { length: 64 }).notNull(),

        // fieldId -> the applicant's raw text-input answer, keyed against
        // whatever ApplyType.fields were live at submission time (e.g.
        // { name_age_nickname: "...", expreience_in_other: "..." }).
        // Snapshotting the raw answers rather than re-resolving against
        // live applyFields later means a reviewer always sees exactly what
        // was submitted, even if the field presets change afterward.
        answers: json("answers").$type<Record<string, string>>().notNull(),

        applicationStatus: applicationStatusEnum("application_status").default("OPEN").notNull(),

        // Message id of the embed posted in incoming_applications — needed
        // to edit/delete that message when status changes (claim/accept/reject).
        applicationMessageId: varchar("application_message_id", { length: 20 }).notNull(),

        // Message id in accepted_archive / rejected_archive once a decision
        // is made (renamed from the old single "archiveMessage" — kept as
        // one column since an application only ever lands in ONE archive).
        archiveMessageId: varchar("archive_message_id", { length: 20 }),

        threadId: varchar("thread_id", { length: 20 }),

        reviewerId: varchar("reviewer_id", { length: 20 }),
        decisionMadeById: varchar("decision_made_by_id", { length: 20 }),
        decisionMotivation: varchar("decision_motivation", { length: 2000 }),

        // If set, applicant can't submit a new application for this server
        // until this timestamp — backs the "через 2 дня" reapply notice in
        // apply.embed.ts. Only meaningful when applicationStatus = REJECTED.
        coolDownUntil: timestamp("cool_down_until"),

        // Null = not yet invited to interview. Set = invited, and doubles
        // as "when" — replaces the old invited_to_interview boolean, since
        // the timestamp carries both facts in one column instead of two
        // that could drift out of sync.
        interviewInvitedAt: timestamp("interview_invited_at"),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
        takenAt: timestamp("taken_at"),
        decisionMadeAt: timestamp("decision_made_at"),
    },
    (table) => ({
        statusIdx: index("application_status_idx").on(table.applicationStatus),
    }),
);