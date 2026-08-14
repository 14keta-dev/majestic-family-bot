import { Client, EmbedBuilder, Guild, GuildMember } from "discord.js";
import { getConfig } from "../config/store";
import { log } from "../logger";
import { metaBuilder } from "../logger/met_builder";
import { vacation_store } from "./vacation.schema";
import { vacation_role_service } from "./remove_roles";

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const EMBED_COLOR = 0x282828;


export function startVacationExpirySweeper(client: Client): NodeJS.Timeout {
    const timer = setInterval(async () => {
        const nowIso = new Date().toISOString();
        const controlled = getConfig().vacation.controlled;

        const expired = vacation_store
            .getAll()
            .filter(
                (v) =>
                    v.status !== "REJECTED" &&
                    v.endedAt === null &&
                    v.estimated_end <= nowIso &&
                    (!controlled || v.status === "APPROVED"),
            );

        if (expired.length === 0) return;

        const vacationRoleId = getConfig().vacation.vacation_role;
        const guild = client.guilds.cache.first(); 

        const botMember: GuildMember | undefined = guild?.members.me ?? undefined;
        const sweepMeta = botMember
            ? metaBuilder(botMember, { command: "vacation_expiry_sweeper" })
            : ({ command: "vacation_expiry_sweeper" } as unknown as ReturnType<typeof metaBuilder>);

        if (!vacationRoleId) {
            log.command.warn(sweepMeta, "Vacation expiry sweep skipped: vacation role not configured");
            return;
        }

        for (const entry of expired) {
            try {
                const member = guild ? await guild.members.fetch(entry.userId).catch(() => null) : null;

                if (member) {
                    await vacation_role_service.restore(member, entry.roles_romeved, vacationRoleId, entry.id);
                }

                const endedAt = new Date().toISOString();
                const updated = await vacation_store.update_vacation(entry.id, { endedAt });

                if (guild && updated) {
                    await replyToLogMessage(guild, sweepMeta, updated.log_message, {
                        userId: entry.userId,
                        durationFormatted: formatDuration(entry.startedAt, endedAt),
                    });
                }

                log.command.info(sweepMeta, `Vacation ${entry.id} auto-expired and roles restored`);
            } catch (error) {
                log.command.error(sweepMeta, `Failed to auto-expire vacation ${entry.id}`, error);
            }
        }
    }, SWEEP_INTERVAL_MS);

    timer.unref();
    return timer;
}

function formatDuration(startIso: string, endIso: string): string {
    const totalMinutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(" ");
}

async function replyToLogMessage(
    guild: Guild,
    meta: ReturnType<typeof metaBuilder>,
    logMessageId: string | null,
    info: { userId: string; durationFormatted: string },
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId || !logMessageId) return;

    try {
        const channel = await guild.channels.fetch(logChannelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(logMessageId).catch(() => null);
        if (!message) return;

        const expiryEmbed = new EmbedBuilder()
            .setTitle("Отпуск завершён автоматически")
            .setDescription(`<@${info.userId}> — срок отпуска истёк`)
            .addFields({ name: "Пробыл в отпуске", value: info.durationFormatted, inline: true })
            .setColor(EMBED_COLOR)
            .setTimestamp();

        await message.reply({ embeds: [expiryEmbed] }).catch((error: unknown) => {
            log.command.error(meta, "Failed to reply to vacation log message", error);
        });

        await message.edit({ components: [] }).catch(() => null);
    } catch (error) {
        log.command.error(meta, "Failed to reply/clear buttons on vacation log message", error);
    }
}