import { EmbedBuilder, WebhookClient } from "discord.js";
import { env } from "../env";

type WebhookLevel = "FATAL" | "ERROR";

const LEVEL_COLORS: Record<WebhookLevel, number> = {
    FATAL: 0xed4245,
    ERROR: 0xf0b232,
};

const LEVEL_TITLES: Record<WebhookLevel, string> = {
    FATAL: "Fatal Error",
    ERROR: "Error",
};

export interface WebhookErrorPayload {
    level: WebhookLevel;
    message: string;
    meta?: Record<string, unknown>;
}

export const sendErrorWebhook = async ({ level, message, meta }: WebhookErrorPayload) => {
    if (!env.WEBHOOK_URL) {
        console.error(`[logger] No webhook configured, dropping ${level} alert:`, message);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(LEVEL_TITLES[level])
        .setDescription(message.length > 4000 ? `${message.slice(0, 4000)}…` : message || "*(no message)*")
        .setColor(LEVEL_COLORS[level])
        .setTimestamp();

    if (meta && Object.keys(meta).length > 0) {
        embed.addFields(
            Object.entries(meta)
                .slice(0, 25)
                .map(([name, value]) => {
                    const raw = typeof value === "string" ? value : JSON.stringify(value, null, 2);
                    return {
                        name: name.slice(0, 256) || "value",
                        value: (raw || "—").slice(0, 1024),
                        inline: false,
                    };
                }),
        );
    }

    try {
        const webhook = new WebhookClient({ url: env.WEBHOOK_URL });
        await webhook.send({
            content: env.DEVELOPER ? `<@${env.DEVELOPER}>` : undefined,
            embeds: [embed],
        });
    } catch (error) {
        console.error("[logger] Failed to send error alert to webhook:", error);
    }
};

export const sendFatalMessage = (message: string, meta?: Record<string, unknown>) =>
    sendErrorWebhook({ level: "FATAL", message, meta });