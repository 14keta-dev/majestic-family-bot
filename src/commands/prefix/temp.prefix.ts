import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    type CategoryChannel,
    type Guild,
    type GuildTextBasedChannel,
    type Message,
    type OverwriteResolvable,
    PermissionFlagsBits,
    type APIMessageComponentEmoji,
} from "discord.js";
import { PrefixCommand } from "../../types";
import { requireManageGuildMessage } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { botAssetsEmojis, botTempVoiceEmojis } from "../../utils/emojis/emojis";
import { getConfig, updateConfig } from "../../utils/config/store";
import { Temp_voice_iterface } from "../../utils/config/temp_voice";

export const TEMP_VOICE_BUTTON_IDS = {
    add_slot: "embed:temp_voice:add_slot:buton",
    remove_slot: "embed:temp_voice:remove_slot:buton",
    open_close: "embed:temp_voice:open_close:buton",
    mute_unmute: "embed:temp_voice:mute_unmute:buton",
    exclude_user: "embed:temp_voice:exclude_user:buton",
    change_bitrate: "embed:temp_voice:change_bitrate:buton",
    change_limit: "embed:temp_voice:change_limit:buton",
    change_leader: "embed:temp_voice:change_leader:buton",
    change_name: "embed:temp_voice:change_name:buton",
    give_user_acess: "embed:temp_voice:give_user_acess:buton",
} as const;

export type TempVoiceButtonKey = keyof typeof TEMP_VOICE_BUTTON_IDS;

interface TempVoiceButtonConfig {
    readonly description: string;
    readonly customId: string;
    readonly emoji: string;
}

export const TEMP_VOICE_BUTTONS: readonly TempVoiceButtonConfig[] = [
    {
        description: "Добавить 1 слот в вашу комнату",
        customId: TEMP_VOICE_BUTTON_IDS.add_slot,
        emoji: botTempVoiceEmojis.add_user,
    },
    {
        description: "Убрать 1 слот из вашей комнаты",
        customId: TEMP_VOICE_BUTTON_IDS.remove_slot,
        emoji: botTempVoiceEmojis.remove_user,
    },
    {
        description: "Разрешить/запретить вход пользователям в вашу комнату",
        customId: TEMP_VOICE_BUTTON_IDS.open_close,
        emoji: botTempVoiceEmojis.open_close,
    },
    {
        description: "Запретить/выдать пользователю возможность говорить в вашей комнате",
        customId: TEMP_VOICE_BUTTON_IDS.mute_unmute,
        emoji: botTempVoiceEmojis.mute_unmute,
    },
    {
        description: "Исключить пользователя из вашей комнаты",
        customId: TEMP_VOICE_BUTTON_IDS.exclude_user,
        emoji: botTempVoiceEmojis.exclude_user,
    },
    {
        description: "Изменить битрейт вашей комнаты",
        customId: TEMP_VOICE_BUTTON_IDS.change_bitrate,
        emoji: botTempVoiceEmojis.bitrate,
    },
    {
        description: "Установить количество слотов в комнате",
        customId: TEMP_VOICE_BUTTON_IDS.change_limit,
        emoji: botTempVoiceEmojis.change_limit,
    },
    {
        description: "Передать право владения комнатой",
        customId: TEMP_VOICE_BUTTON_IDS.change_leader,
        emoji: botTempVoiceEmojis.change_leader,
    },
    {
        description: "Сменить название вашей комнаты",
        customId: TEMP_VOICE_BUTTON_IDS.change_name,
        emoji: botTempVoiceEmojis.change_name,
    },
    {
        description: "Выдать/забрать доступ пользователя в вашу комнату",
        customId: TEMP_VOICE_BUTTON_IDS.give_user_acess,
        emoji: botTempVoiceEmojis.give_user_acess,
    },
] as const;


const CHANNEL_NAMES = {
    category: "—・Temp Voice",
    settings: "┌⚙️・settings",
    create: "└➕・create",
} as const;

const PANEL_COLOR = 0x282828;
const BUTTONS_PER_ROW = 5;
const CREATE_REASON = "Temp voice panel setup";
const REPLACE_REASON = "Replacing existing temp voice setup";
const DISCORD_UNKNOWN_CHANNEL_CODE = 10003;


const EMOJI_TAG_PATTERN = /^<(a)?:(\w+):(\d+)>$/;


function parseEmojiTag(tag: string): APIMessageComponentEmoji | null {
    const match = EMOJI_TAG_PATTERN.exec(tag);
    if (!match) {
        console.warn(`[temp voice] Invalid emoji tag in config: "${tag}"`);
        return null;
    }
    const [, animatedFlag, name, id] = match;
    return { id, name, animated: Boolean(animatedFlag) };
}

function buildTempVoiceRows(): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < TEMP_VOICE_BUTTONS.length; i += BUTTONS_PER_ROW) {
        const chunk = TEMP_VOICE_BUTTONS.slice(i, i + BUTTONS_PER_ROW);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            chunk.map((config) => {
                const button = new ButtonBuilder()
                    .setCustomId(config.customId)
                    .setStyle(ButtonStyle.Secondary);

                const emoji = parseEmojiTag(config.emoji);
                if (emoji) button.setEmoji(emoji);

                return button;
            })
        );

        rows.push(row);
    }

    return rows;
}

function buildButtonLegend(): string {
    return TEMP_VOICE_BUTTONS.map((b) => `${b.emoji} = ${b.description}`).join("\n");
}

function buildPanelEmbed(createChannelId: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${botAssetsEmojis.dot} Панель управления комнатами`)
        .setDescription(
            `> Чтобы **управлять** комнатой, используй кнопки ниже\n` +
            `> Для **создания** комнаты зайди в канал <#${createChannelId}>\n\n` +
            buildButtonLegend()
        )
        .setColor(PANEL_COLOR);
}

function buildDefaultPermissions(everyoneRoleId: string): OverwriteResolvable[] {
    return [
        {
            id: everyoneRoleId,
            deny: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseApplicationCommands,
            ],
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        },
    ];
}


class ChannelSetupRollback {
    private readonly created: { id: string; delete: (reason?: string) => Promise<unknown> }[] = [];

    track<T extends { id: string; delete: (reason?: string) => Promise<unknown> }>(channel: T): T {
        this.created.push(channel);
        return channel;
    }

    async rollback(meta: ReturnType<typeof metaBuilder>): Promise<void> {
        for (const channel of [...this.created].reverse()) {
            try {
                await channel.delete(CREATE_REASON + " (rollback)");
            } catch (error) {
                log.command.error(meta, `Rollback failed to delete channel ${channel.id}: ${String(error)}`);
            }
        }
    }
}

function isUnknownChannelError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === DISCORD_UNKNOWN_CHANNEL_CODE
    );
}

async function deleteExistingTempVoiceSetup(
    guild: Guild,
    existing: Temp_voice_iterface,
    meta: ReturnType<typeof metaBuilder>
): Promise<void> {
    const idsChildFirst = [existing.create_channel, existing.panel_channel, existing.category];

    for (const id of idsChildFirst) {
        try {
            const channel = await guild.channels.fetch(id);
            await channel?.delete(REPLACE_REASON);
        } catch (error) {
            if (isUnknownChannelError(error)) continue;
            log.command.error(meta, `Failed to delete previous temp voice channel ${id}: ${String(error)}`);
        }
    }
}

export default {
    name: "temp",
    description: "Creates temp voice panel",
    async executePrefix(message: Message) {
        if (!message.guild || !message.member) return;
        if (!(await requireManageGuildMessage(message as Message<true>))) return;

        const { guild } = message;
        const meta = metaBuilder(message.member, { prefix: "temp" });
        const defaultPermissions = buildDefaultPermissions(guild.roles.everyone.id);
        const rollback = new ChannelSetupRollback();

        log.command.info(meta, "Temp prefix command triggered");

        try {
            const existing = getConfig().temp_voice;

            if (existing) {
                log.command.info(meta, "Existing temp voice setup found — removing before recreating");
                await deleteExistingTempVoiceSetup(guild, existing, meta);
                await updateConfig({ temp_voice: {} });
            }

            const category = rollback.track(
                (await guild.channels.create({
                    name: CHANNEL_NAMES.category,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: defaultPermissions,
                    reason: CREATE_REASON,
                })) as CategoryChannel
            );

            const settingsChannel = rollback.track(
                await guild.channels.create({
                    name: CHANNEL_NAMES.settings,
                    type: ChannelType.GuildText,
                    permissionOverwrites: defaultPermissions,
                    parent: category.id,
                    reason: CREATE_REASON,
                })
            );

            const createVoiceChannel = rollback.track(
                await guild.channels.create({
                    name: CHANNEL_NAMES.create,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: defaultPermissions,
                    reason: CREATE_REASON,
                })
            );

            const panelMessage = await sendPanel(settingsChannel, createVoiceChannel.id);

            await updateConfig({
                temp_voice: {
                    category: category.id,
                    panel_channel: settingsChannel.id,
                    create_channel: createVoiceChannel.id,
                    panel_message_id: panelMessage.id,
                },
            });

            log.command.info(meta, "Temp voice panel created");
            await message.delete().catch((error) => {
                log.command.warn(meta, `Could not delete trigger message: ${String(error)}`);
            });
        } catch (error) {
            log.command.error(meta, `Failed to set up temp voice panel: ${String(error)}`);
            await rollback.rollback(meta);
            await message.delete().catch(() => { });
        }
    },
} satisfies PrefixCommand;

async function sendPanel(channel: GuildTextBasedChannel, createChannelId: string): Promise<Message> {
    return channel.send({
        embeds: [buildPanelEmbed(createChannelId)],
        components: buildTempVoiceRows(),
    });
}