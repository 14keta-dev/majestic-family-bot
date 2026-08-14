import { Client, EmbedBuilder, TextBasedChannel } from "discord.js";
import { afk_store, AFK_schema, Not_in_afk_error } from "./afk.schema";
import { getConfig } from "../config/store";
import { botAssetEmojis } from "../emojis/emojis";

const AUTOKICK_CHECK_INTERVAL_MS = 60 * 1000; 
const SYSTEM_KICK_REASON = "Время AFK истекло";
const SYSTEM_KICKED_BY_ID = "system";

export interface AfkAutokickScheduler {
    stop: () => void;
}

let activeScheduler: AfkAutokickScheduler | null = null;

function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}m`;
}

async function postSystemKickLog(logChannel: TextBasedChannel, entry: AFK_schema): Promise<string | null> {
    const originalMessage = await logChannel.messages.fetch(entry.log_message).catch(() => null);
    if (!originalMessage) return null;

    const enteredAt = new Date(entry.enteredAt);
    const elapsedMinutes = Math.max(0, Math.round((Date.now() - enteredAt.getTime()) / 60_000));

    const kickEmbed = new EmbedBuilder()
        .setTitle("> AFK: снят системой")
        .setDescription(`<@${entry.userId}> был автоматически снят с AFK — время истекло`)
        .addFields(
            { name: "> Пробыл в AFK", value: `${botAssetEmojis.dot} ${formatMinutes(elapsedMinutes)}`, inline: true },
            { name: "> Ушёл в AFK", value: `${botAssetEmojis.dot} <t:${Math.floor(enteredAt.getTime() / 1000)}:R>`, inline: true },
            { name: "> Причина", value: `${botAssetEmojis.dot} ${entry.afk_reason}`, inline: false },
        )
        .setColor("Orange")
        .setTimestamp();

    const replyMessage = await originalMessage.reply({ embeds: [kickEmbed] }).catch(() => null);
    if (!replyMessage) return null;

    const originalEmbed = originalMessage.embeds[0];
    const updatedEmbed = originalEmbed ? EmbedBuilder.from(originalEmbed) : new EmbedBuilder().setTitle("> AFK");
    updatedEmbed.setColor("Orange");
    await originalMessage.edit({ embeds: [updatedEmbed], components: [] }).catch(() => null);

    return replyMessage.id;
}

async function processExpiredEntry(logChannel: TextBasedChannel | null, entry: AFK_schema): Promise<void> {

    let kicked: AFK_schema;
    try {
        kicked = await afk_store.kick(entry.userId, SYSTEM_KICKED_BY_ID, SYSTEM_KICK_REASON, entry.log_message);
    } catch (error) {
        if (error instanceof Not_in_afk_error) return; 
        console.error(`[afk-autokick] Failed to record system kick for user ${entry.userId}:`, error);
        return;
    }

    console.info(`[afk-autokick] Auto-kicked user ${entry.userId} from afk (timeout expired)`);

    if (!logChannel) return;

    try {
        const leaveMessageId = await postSystemKickLog(logChannel, kicked);
        if (leaveMessageId) {
            await afk_store.setLeaveMessage(kicked.id, leaveMessageId).catch((error) => {
                console.error(`[afk-autokick] Failed to persist leave message id for ${entry.userId}:`, error);
            });
        }
    } catch (error) {
        console.error(`[afk-autokick] Failed to post system kick log for user ${entry.userId}:`, error);
    }
}

function createScheduler(client: Client, guildId: string): AfkAutokickScheduler {
    let stopped = false;
    let running = false;
    let timeoutHandle: NodeJS.Timeout;

    async function tick(): Promise<void> {
        if (running) {
            scheduleNext();
            return;
        }
        running = true;

        try {
            const expired = afk_store.get_all_expired();

            if (expired.length > 0) {
                const config = getConfig();
                let logChannel: TextBasedChannel | null = null;

                if (config.logs.afk_log) {
                    const guild = await client.guilds.fetch(guildId).catch(() => null);
                    const channel = guild
                        ? await guild.channels.fetch(config.logs.afk_log).catch(() => null)
                        : null;
                    logChannel = channel?.isTextBased() ? channel : null;
                }

                for (const entry of expired) {
                    await processExpiredEntry(logChannel, entry);
                }
            }
        } catch (error) {
            console.error("[afk-autokick] Unhandled error in autokick tick:", error);
        } finally {
            running = false;
            scheduleNext();
        }
    }

    function scheduleNext(): void {
        if (stopped) return;
        timeoutHandle = setTimeout(tick, AUTOKICK_CHECK_INTERVAL_MS);
        timeoutHandle.unref();
    }

    scheduleNext();

    return {
        stop: () => {
            stopped = true;
            clearTimeout(timeoutHandle);
        },
    };
}

export function startAfkAutokickScheduler(client: Client, guildId: string): AfkAutokickScheduler {
    if (activeScheduler) {
        console.warn(
            "[afk-autokick] startAfkAutokickScheduler called again while a scheduler is already running — " +
            "ignoring duplicate call and returning the existing instance. If this happens on every startup, " +
            "check for duplicate `ready` event registration in your event loader.",
        );
        return activeScheduler;
    }

    const scheduler = createScheduler(client, guildId);

    activeScheduler = {
        stop: () => {
            scheduler.stop();
            activeScheduler = null;
        },
    };

    return activeScheduler;
}