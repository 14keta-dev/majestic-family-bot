import { z } from "zod";
import { BotConfig, DeepPartial } from "./types";
import { Majestic_Servers } from "../emojis/server_emoji_map";

const channelsSchema = z.object({
    apply_channel: z.string(),
    incoming_applications: z.string(),
    interview_channel: z.string(),
    accepted_archive: z.string(),
    rejected_archive: z.string(),
    status_log: z.string().optional(),
});

const familyApplicationsSchema = z.object({
    active: z.boolean(),
    server: z.nativeEnum(Majestic_Servers),
    channels: channelsSchema,
    apply_messageId: z.string().nullable(),
    priority_roles: z.array(z.string()).default([]),
});

const afkSchema = z.object({
    panel_channel: z.string(),
    panel_message: z.string(),
});

const logsSchema = z.object({
    category: z.string(),
    afk_log: z.string(),
    vacation_log: z.string().optional(),
});

const vacationSchema = z.object({
    controlled: z.boolean(),
    ping_role: z.array(z.string()).optional(),
    incoming_request: z.string().optional(),
    archive_channel: z.string().optional(),
    vacation_role: z.string(),
    panel_channel: z.string(),
    panel_message: z.string(),
});

export const botConfigSchema = z.object({
    family_applications: familyApplicationsSchema,
    AFK: afkSchema,
    logs: logsSchema,
    vacation: vacationSchema,
});

const channelsPartialSchema = channelsSchema.partial();

const familyApplicationsPartialSchema = z.object({
    active: z.boolean(),
    server: z.nativeEnum(Majestic_Servers).optional(),
    channels: channelsPartialSchema.optional(),
    apply_messageId: z.string().nullable().optional(),
    priority_roles: z.array(z.string()).optional(),
});

const afkPartialSchema = afkSchema.partial();
const logsPartialSchema = logsSchema.partial();
const vacationPartialSchema = vacationSchema.partial();

const botConfigPartialSchema = z.object({
    family_applications: familyApplicationsPartialSchema.optional(),
    AFK: afkPartialSchema.optional(),
    logs: logsPartialSchema.optional(),
    vacation: vacationPartialSchema.optional(),
});

export function parsePartialConfig(data: unknown): DeepPartial<BotConfig> {
    try {
        return botConfigPartialSchema.parse(data) as DeepPartial<BotConfig>;
    } catch (error) {
        throw new Error(`config.json failed validation:\n${formatZodError(error)}`);
    }
}

export function validateFullConfig(data: unknown): BotConfig {
    try {
        return botConfigSchema.parse(data) as BotConfig;
    } catch (error) {
        throw new Error(`Merged config is invalid (defaults + config.json produced a bad shape):\n${formatZodError(error)}`);
    }
}

function formatZodError(error: unknown): string {
    if (error instanceof z.ZodError) {
        return error.issues.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    }
    return String(error);
}