import { ButtonInteraction, CategoryChannel, ChannelType, EmbedBuilder, GuildChannel, Message, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { SETUP_AFK_CUSTOM_ID } from "../../embed/AFK/set_up.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import {
    AFK_config_draft,
    clearAfkDraft,
    getAfkDraft,
    isAfkDraftComplete,
    missingAfkDraftFields,
} from "../../utils/AFK/draft_afk_store";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig, updateConfig } from "../../utils/config/store";
import { afk_embed } from "../../embed/AFK/afk.embed";

const FIELD_LABELS: Record<string, string> = {
    panel_channel: "Канал с панелью AFK",
    afk_log: "Канал логов AFK",
};

type Meta = ReturnType<typeof metaBuilder>;

export default {
    customId: SETUP_AFK_CUSTOM_ID.confirm,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const draft = getAfkDraft(interaction.message.id);
        if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
            await interaction.reply({
                content: "Эту настройку начал другой администратор. Попросите его подтвердить, либо начните заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const meta = metaBuilder(interaction.member, { button: "afk_setup_confirm" });

        try {
            log.button.info(meta, "Deferring update");
            await interaction.deferUpdate();
        } catch (error) {
            log.button.error(meta, "Could not defer update in time");
            await safeReply(interaction, error, "afk_setup_confirm.deferUpdate", interaction.id);
            return;
        }

        try {
            if (!isAfkDraftComplete(draft)) {
                const missing = missingAfkDraftFields(draft).map((key) => FIELD_LABELS[key] ?? key);
                await interaction.followUp({
                    content: `Заполните все поля перед подтверждением. Не выбрано: ${missing.join(", ")}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (draft.isEdit) {
                await handleEditSetupConfirm(interaction, draft, meta);
            } else {
                await handleNewSetupConfirm(interaction, draft, meta);
            }
        } catch (error) {
            log.button.error(meta, "Failed to save AFK setup");
            await safeReply(interaction, error, "afk_setup_confirm.execute", interaction.id);
        }
    },
} satisfies Button;


async function resolveAfkLogChannelId(
    interaction: ButtonInteraction<"cached">,
    draft: AFK_config_draft,
    meta: Meta,
): Promise<{ afk_log: string; category?: string } | null> {
    if (draft.afk_log) {
        return { afk_log: draft.afk_log };
    }

    const config = getConfig();

    if (config.logs.afk_log) {
        return { afk_log: config.logs.afk_log };
    }

    let categoryId = config.logs.category;

    if (!categoryId) {
        let category: CategoryChannel;
        try {
            category = await interaction.guild.channels.create({
                name: "bot-logs",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });
        } catch (error) {
            log.button.error(meta, "Failed to create bot-logs category");
            await safeReply(interaction, error, "afk_setup_confirm.createLogCategory", interaction.id);
            return null;
        }
        categoryId = category.id;
    }

    let logChannel: TextChannel;
    try {
        logChannel = await interaction.guild.channels.create({
            name: "afk-logs",
            parent: categoryId,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
            ],
        });
    } catch (error) {
        log.button.error(meta, "Failed to create afk-logs channel");
        await safeReply(interaction, error, "afk_setup_confirm.createLogChannel", interaction.id);
        return null;
    }

    return { afk_log: logChannel.id, category: categoryId };
}

async function handleNewSetupConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: AFK_config_draft,
    meta: Meta,
) {
    const resolvedLogs = await resolveAfkLogChannelId(interaction, draft, meta);
    if (!resolvedLogs) return;

    await updateConfig({
        AFK: {
            panel_channel: draft.panel_channel,
        },
        logs: resolvedLogs,
    });

    const panel_channel = await interaction.guild.channels.fetch(draft.panel_channel!);

    if (!panel_channel?.isTextBased()) {
        log.button.error(meta, "Panel channel is not text based, could not send AFK panel");
        await interaction.followUp({
            content: "Выбранный канал панели не текстовый. Настройка сохранена, но панель не отправлена — выберите канал заново.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    let panelMessage: Message;

    try {
        const { embed, row } = afk_embed();

        panelMessage = await panel_channel.send({
            embeds: [embed],
            components: [row],
        });
    } catch (error) {
        log.button.error(meta, "Failed to send AFK panel message to panel channel");
        await safeReply(interaction, error, "afk_setup_confirm.sendPanelMessage", interaction.id);
        return;
    }

    await updateConfig({
        AFK: {
            panel_message: panelMessage.id,
        },
    });

    clearAfkDraft(interaction.message.id);
    log.button.info(meta, "AFK setup completed");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Готово").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}

async function handleEditSetupConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: AFK_config_draft,
    meta: Meta,
) {
    const resolvedLogs = await resolveAfkLogChannelId(interaction, draft, meta);
    if (!resolvedLogs) return;

    const previous = getConfig().AFK;
    const previousPanelChannel = previous.panel_channel;
    const previousMessageId = previous.panel_message;
    const channelChanged = draft.panel_channel !== previousPanelChannel;

    await updateConfig({
        AFK: {
            panel_channel: draft.panel_channel,
        },
        logs: resolvedLogs,
    });

    let newMessageId: string | null | undefined = previousMessageId;

    if (channelChanged || !previousMessageId) {
        const panel_channel = await interaction.guild.channels.fetch(draft.panel_channel!);

        if (!panel_channel?.isTextBased()) {
            log.button.error(meta, "Panel channel is not text based, could not send AFK panel");
            await interaction.followUp({
                content: "Выбранный канал панели не текстовый. Остальные настройки сохранены, но панель не отправлена — выберите канал заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        let panelMessage: Message;
        try {
            const { embed, row } = afk_embed();

            panelMessage = await panel_channel.send({
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            log.button.error(meta, "Failed to send new AFK panel message to panel channel");
            await safeReply(interaction, error, "afk_setup_confirm.editSendPanelMessage", interaction.id);
            return;
        }

        newMessageId = panelMessage.id;

        if (channelChanged && previousPanelChannel && previousMessageId) {
            try {
                const oldChannel = await interaction.guild.channels.fetch(previousPanelChannel);
                if (oldChannel?.isTextBased()) {
                    await oldChannel.messages.delete(previousMessageId);
                }
            } catch {
                // Old message/channel already gone — nothing to clean up.
            }
        }

        await updateConfig({
            AFK: {
                panel_message: newMessageId,
            },
        });
    }

    clearAfkDraft(interaction.message.id);
    log.button.info(meta, "AFK setup edited");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Сохранено").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}