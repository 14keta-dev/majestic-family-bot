

import { z } from "zod";
import { BotConfig, DeepPartial } from "./types";
import { Majestic_Servers } from "../emojis/server_emoji_map";

// ── Full (strict) schema ──────────────────────────────────────────────────

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

export const botConfigSchema = z.object({
    family_applications: familyApplicationsSchema,
});

const channelsPartialSchema = channelsSchema.partial();

const familyApplicationsPartialSchema = z.object({
    active: z.boolean(),
    server: z.nativeEnum(Majestic_Servers).optional(),
    channels: channelsPartialSchema.optional(),
    apply_messageId: z.string().nullable().optional(),
    priority_roles: z.array(z.string()).optional(),
});

const botConfigPartialSchema = z.object({
    family_applications: familyApplicationsPartialSchema.optional(),
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