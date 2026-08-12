
import { ButtonInteraction, CacheType, EmbedBuilder, Message, MessageFlags } from "discord.js";
import { SETUP_FAMILY_APPLICATIONS_CUSTOM_ID, build_set_up_family_applications_embed } from "../../../embed/family_applications/set_up.embed";
import { buildApplyEmbed } from "../../../embed/family_applications/apply.embed";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";
import {
    clearDraft,
    FamilyApplicationsSetupDraft,
    getDraft,
    isDraftComplete,
    missingDraftFields,
} from "../../../utils/family_applications/setupDraftStore";
import { getConfig, updateConfig } from "../../../utils/config/store";
import { Button } from "../../../types";

const FIELD_LABELS: Record<string, string> = {
    server: "Сервер заявок",
    apply_channel: "Канал подачи заявок",
    incoming_applications: "Канал с новыми заявками",
    interview_channel: "Канал для обзвона кандидатов",
    accepted_archive: "Архив принятых заявок",
    rejected_archive: "Архив отклонённых заявок",
};

type Meta = ReturnType<typeof metaBuilder>;

export default {
    customId: SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.confirm,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const draft = getDraft(interaction.message.id);
        if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
            await interaction.reply({
                content: "Эту настройку начал другой администратор. Попросите его подтвердить, либо начните заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const meta = metaBuilder(interaction.member, { button: "family_applications_setup_confirm" });

        try {
            log.button.info(meta, "Deferring update");
            await interaction.deferUpdate();
        } catch (error) {
            log.button.error(meta, "Could not defer update in time");
            await safeReply(interaction, error, "family_applications_setup_confirm.deferUpdate", interaction.id);
            return;
        }

        try {
            if (!isDraftComplete(draft)) {
                const missing = missingDraftFields(draft).map((key) => FIELD_LABELS[key] ?? key);
                await interaction.followUp({
                    content: `Заполните все поля перед подтверждением. Не выбрано: ${missing.join(", ")}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (draft.isEdit) {
                await handleEditConfirm(interaction, draft, meta);
            } else {
                await handleNewSetupConfirm(interaction, draft, meta);
            }
        } catch (error) {
            log.button.error(meta, "Failed to save family applications setup");
            await safeReply(interaction, error, "family_applications_setup_confirm.execute", interaction.id);
        }
    },
} satisfies Button;


async function handleNewSetupConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: FamilyApplicationsSetupDraft,
    meta: Meta,
) {
    const configuredButClosed = await updateConfig({
        family_applications: {
            server: draft.server,
            active: false,
            channels: {
                apply_channel: draft.apply_channel,
                incoming_applications: draft.incoming_applications,
                interview_channel: draft.interview_channel,
                accepted_archive: draft.accepted_archive,
                rejected_archive: draft.rejected_archive,
                status_log: draft.status_log,
            },
            priority_roles: draft.priority_roles ?? [],
        },
    });

    const apply_channel = await interaction.guild.channels.fetch(draft.apply_channel!);

    if (!apply_channel?.isTextBased()) {
        log.button.error(meta, "Apply channel is not text based, could not send apply message");
        await interaction.followUp({
            content: "Выбранный канал подачи заявок не текстовый. Настройка сохранена, но заявки остаются закрыты — выберите канал заново.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    let applyMessage: Message;
    try {

        applyMessage = await apply_channel.send({
            components: buildApplyEmbed({ ...configuredButClosed.family_applications, active: true }),
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (error) {
        log.button.error(meta, "Failed to send apply message to apply channel");
        await safeReply(interaction, error, "family_applications_setup_confirm.sendApplyMessage", interaction.id);

        return;
    }

    await updateConfig({
        family_applications: {
            active: true,
            apply_messageId: applyMessage.id,
        },
    });

    clearDraft(interaction.message.id);
    log.button.info(meta, "Family applications setup completed");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Готово").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}


async function handleEditConfirm(
    interaction: ButtonInteraction<"cached">,
    draft: FamilyApplicationsSetupDraft,
    meta: Meta,
) {
    const previous = getConfig().family_applications;
    const previousApplyChannel = previous.channels.apply_channel;
    const previousMessageId = previous.apply_messageId;
    const channelChanged = draft.apply_channel !== previousApplyChannel;

    const updated = await updateConfig({
        family_applications: {
            server: draft.server,
            active: true,
            channels: {
                apply_channel: draft.apply_channel,
                incoming_applications: draft.incoming_applications,
                interview_channel: draft.interview_channel,
                accepted_archive: draft.accepted_archive,
                rejected_archive: draft.rejected_archive,
                status_log: draft.status_log,
            },
            priority_roles: draft.priority_roles ?? [],
        },
    });

    let newMessageId: string | null = previousMessageId;

    if (!channelChanged && previousMessageId) {
        try {
            const applyChannel = await interaction.guild.channels.fetch(previousApplyChannel);
            if (applyChannel?.isTextBased()) {
                const existing = await applyChannel.messages.fetch(previousMessageId);
                await existing.edit({
                    components: buildApplyEmbed(updated.family_applications),
                    flags: MessageFlags.IsComponentsV2,
                });
            } else {
                newMessageId = null;
            }
        } catch {
            log.button.warn(meta, "Could not edit existing apply message in place, reposting");
            newMessageId = null;
        }
    }

    if (channelChanged || !newMessageId) {
        const applyChannel = await interaction.guild.channels.fetch(draft.apply_channel!);
        if (!applyChannel?.isTextBased()) {
            log.button.error(meta, "Apply channel is not text based, could not update apply message");
            await interaction.followUp({
                content: "Выбранный канал подачи заявок не текстовый. Остальные настройки сохранены, но сообщение подачи заявок не обновлено — выберите канал заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        let applyMessage: Message;
        try {
            applyMessage = await applyChannel.send({
                components: buildApplyEmbed(updated.family_applications),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to send new apply message to apply channel");
            await safeReply(interaction, error, "family_applications_setup_confirm.editSendApplyMessage", interaction.id);
            return;
        }

        newMessageId = applyMessage.id;

        if (channelChanged && previousMessageId) {
            try {
                const oldChannel = await interaction.guild.channels.fetch(previousApplyChannel);
                if (oldChannel?.isTextBased()) {
                    await oldChannel.messages.delete(previousMessageId);
                }
            } catch {
                // Old message/channel already gone — nothing to clean up.
            }
        }
    }

    if (newMessageId !== previousMessageId) {
        await updateConfig({ family_applications: { apply_messageId: newMessageId } });
    }

    clearDraft(interaction.message.id);
    log.button.info(meta, "Family applications settings updated");

    await interaction.deleteReply();
    await interaction.followUp({
        embeds: [new EmbedBuilder().setTitle("Настройки сохранены").setColor("Green")],
        flags: MessageFlags.Ephemeral,
    });
}