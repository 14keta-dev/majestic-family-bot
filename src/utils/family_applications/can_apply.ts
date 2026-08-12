import { GuildMember } from "discord.js";
import { db } from "../db";
import { applicationSchema } from "../db/schema";
import { and, desc, eq, or } from "drizzle-orm";

export async function can_apply_to_family(member: GuildMember) {
    if (!member) {
        throw new Error("No member provided to check if they're eligible to apply");
    }

    const activeApplications = await db
        .select()
        .from(applicationSchema)
        .where(
            and(
                eq(applicationSchema.applicantId, member.id),
                or(
                    eq(applicationSchema.applicationStatus, "OPEN"),
                    eq(applicationSchema.applicationStatus, "TAKEN"),
                ),
            ),
        )
        .limit(1);

    if (activeApplications.length > 0) {
        return {
            message: "У вас уже есть открытая заявка",
            status: false,
        };
    }

    const [latestApplication] = await db
        .select()
        .from(applicationSchema)
        .where(eq(applicationSchema.applicantId, member.id))
        .orderBy(desc(applicationSchema.createdAt))
        .limit(1);

    if (
        latestApplication?.applicationStatus === "REJECTED" &&
        latestApplication.coolDownUntil &&
        latestApplication.coolDownUntil > new Date()
    ) {
        const timestamp = Math.floor(latestApplication.coolDownUntil.getTime() / 1000);

        return {
            message: `Вы сможете подать заявку снова <t:${timestamp}:R>`,
            status: false,
        };
    }

    return {
        message: null,
        status: true,
    };
}