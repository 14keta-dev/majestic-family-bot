import { ButtonInteraction, EmbedBuilder, GuildChannel, Message, MessageFlags, TextBasedChannel } from "discord.js";
import { SETUP_BACKPACK_CUSTOM_ID } from "../../embed/bacpack/set_up.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { Backpack_config_draft, clearBackpackDraft, getBackpackDraft, isBackpackDraftComplete, missingBackpackDraftFields } from "../../utils/backpack/draft";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig, updateConfig } from "../../utils/config/store";
import { create_backpack_embed } from "../../embed/bacpack/create_backpack.embed";
import { rewrite_backpack_permissions, RewritePermissionsResult } from "../../utils/backpack/rewrite_permissions";
import { backpack_store } from "../../utils/backpack/backpack.schema";

const FIELD_LABELS: Record<string, string> = {
    panel_channel: "Канал с панелью портфелей",
    allowed_roles: "Роли модерации",
};

function rolesChanged(previous: string[] | undefined, next: string[] | undefined): boolean {
    const a = new Set(previous ?? []);
    const b = new Set(next ?? []);
    if (a.size !== b.size) return true;
    for (const role of a) {
        if (!b.has(role)) return true;
    }
    return false;
}

const guildsRewritingBackpackPermissions = new Set<string>();

type Meta = ReturnType<typeof metaBuilder>;

export default {
    customId: SETUP_BACKPACK_CUSTOM_ID.confirm,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        if (guildsRewritingBackpackPermissions.has(interaction.guildId)) {
            await interaction.reply({
                content: "⏳ Права доступа сейчас обновляются после предыдущего изменения. Дождитесь завершения и повторите попытку.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const draft = getBackpackDraft(interaction.message.id);
        if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
            await interaction.reply({
                content: "Эту настройку начал другой администратор. Попросите его подтвердить, либо начните заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const meta = metaBuilder(interaction.member, { button: "backpack_setup_confirm" });

        try {
            log.button.info(meta, "Deferring update");
            await interaction.deferUpdate();
        } catch (error) {
            log.button.error(meta, "Could not defer update in time");
            await safeReply(interaction, error, "backpack_setup_confirm.deferUpdate", interaction.id);
            return;
        }

        try {
            if (!isBackpackDraftComplete(draft)) {
                const missing = missingBackpackDraftFields(draft).map((key) => FIELD_LABELS[key] ?? key);
                await interaction.followUp({
                    content: `Заполните все поля перед подтверждением. Не выбрано: ${missing.join(", ")}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const panel_channel = await interaction.guild.channels.fetch(draft.panel_channel!);

            if (!panel_channel?.isTextBased()) {
                await interaction.followUp({
                    content: "Выбранный канал панели не текстовый. Выберите канал заново — настройки ещё не сохранены.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (draft.isEdit) {
                await handleEditSetupConfirm(interaction, draft, panel_channel as GuildChannel, meta);
            } else {
                await handleNewSetupConfirm(interaction, draft, panel_channel as GuildChannel, meta);
            }
        } catch (error) {
            log.button.error(meta, "Failed to save backpack setup");
            await safeReply(interaction, error, "bacpack_setup_confirm.execute", interaction.id);
        }
    },
} satisfies Button;

async function handleNewSetupConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: Backpack_config_draft,
    panel_channel: GuildChannel,
    meta: Meta,
) {


    let panelMessage: Message;

    if (!panel_channel.isTextBased()) return;


    try {
        panelMessage = await panel_channel.send({
            components: create_backpack_embed(),
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (error) {
        log.button.error(meta, "Failed to send bacpack panel message to panel channel");
        await safeReply(interaction, error, "backpack_setup_confirm.sendPanelMessage", interaction.id);
        return;
    }

    await updateConfig({
        backpack: {
            panel_channel: draft.panel_channel,
            allowed_roles: draft.allowed_roles,
            panel_message: panelMessage.id,
        },
    });

    clearBackpackDraft(interaction.message.id);
    log.button.info(meta, "Backpack setup completed");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Готово").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}

async function handleEditSetupConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: Backpack_config_draft,
    panel_channel: GuildChannel,
    meta: Meta,
) {
    const previous = getConfig().backpack;
    const previousPanelChannel = previous.panel_channel;
    const previousMessageId = previous.panel_message;

    const channelChanged = draft.panel_channel !== previousPanelChannel;
    const rolesDidChange = rolesChanged(previous.allowed_roles, draft.allowed_roles);

    let newMessageId: string | undefined = previousMessageId;

    if (!panel_channel.isTextBased()) return;

    if (channelChanged || !previousMessageId) {
        let panelMessage: Message;
        try {
            panelMessage = await panel_channel.send({
                components: create_backpack_embed(),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to send new backpack panel message to panel channel");
            await safeReply(interaction, error, "backpack_setup_confirm.editSendPanelMessage", interaction.id);
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
    }

    await updateConfig({
        backpack: {
            panel_channel: draft.panel_channel,
            allowed_roles: draft.allowed_roles,
            panel_message: newMessageId,
        },
    });

    let permissionsResult: RewritePermissionsResult | null = null;

    if (rolesDidChange) {
        guildsRewritingBackpackPermissions.add(interaction.guildId);

        const channelCount = backpack_store.get_all_channels().length;
        const categoryCount = backpack_store.get_all_categories().length;

        let progressMessage: Message | undefined;
        try {
            progressMessage = await interaction.followUp({
                content: `⏳ Роли изменены — обновляю права доступа для ${categoryCount} категорий и ${channelCount} каналов. Это может занять некоторое время, пожалуйста подождите...`,
                flags: MessageFlags.Ephemeral,
            });
        } catch {
            // Non-critical if this fails to send — we still run the rewrite.
        }

        try {
            permissionsResult = await rewrite_backpack_permissions(interaction.guild, draft.allowed_roles!);
            log.button.info(
                meta,
                `Rewrote backpack permissions: ${permissionsResult.categoriesUpdated} categories, ${permissionsResult.channelsUpdated} channels, ${permissionsResult.skipped.length} skipped`,
            );

            const doneContent = `✅ Права доступа обновлены: ${permissionsResult.categoriesUpdated} категорий, ${permissionsResult.channelsUpdated} каналов` +
                (permissionsResult.skipped.length ? `. Пропущено (вероятно удалены): ${permissionsResult.skipped.length}.` : ".");

            if (progressMessage) {
                await interaction.webhook.editMessage(progressMessage.id, { content: doneContent }).catch(() => { });
            } else {
                await interaction.followUp({ content: doneContent, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            log.button.error(meta, "Failed to rewrite backpack permissions after role change");
            const failContent = "Настройки сохранены, но права доступа для существующих каналов обновить не удалось. Попробуйте снова позже.";

            if (progressMessage) {
                await interaction.webhook.editMessage(progressMessage.id, { content: failContent }).catch(() => { });
            } else {
                await interaction.followUp({ content: failContent, flags: MessageFlags.Ephemeral });
            }
        } finally {
            guildsRewritingBackpackPermissions.delete(interaction.guildId);
        }
    }

    clearBackpackDraft(interaction.message.id);
    log.button.info(meta, "Backpack setup edited");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Сохранено").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}