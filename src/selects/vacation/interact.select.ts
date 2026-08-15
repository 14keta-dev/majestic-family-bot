import {
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuInteraction,
} from "discord.js";
import { VACATION_EMBED_CUSTOM_IDS, VACATION_LIST_PAGINATION_CUSTOM_ID } from "../../embed/vacation/vacation.embed";
import { StringSelectMenu } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import take_vacation from "../../utils/vacation/handle_take.helper";
import { resetSelectMenu } from "../../utils/resetSelet.helper";
import { getConfig } from "../../utils/config/store";
import { resolveVacationConfig } from "../../utils/vacation/config";
import { VacationConfigError } from "../../utils/vacation/errors";
import {
    acquireVacationEntryLock,
    findActiveVacation,
    formatVacationDuration,
    listActiveVacations,
    releaseVacationEntryLock,
    Vacation_entry_locked_error,
    vacation_store,
} from "../../utils/vacation/vacation.schema";
import { vacation_role_service } from "../../utils/vacation/remove_roles";
import { respond } from "../../utils/vacation/respond.helper";
import { vacation_components } from "../../embed/vacation/vacation.components";
import { buildVacationListEmbed, chunk } from "../../utils/vacation/vacation_list.helper";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

const EMBED_COLOR = 0xF2B84B;
const SUCCESS_COLOR = 0x57C77A;
const WARNING_COLOR = 0xF2B84B;

const VACATION_LIST_PAGE_SIZE = 5;

export default {
    customId: VACATION_EMBED_CUSTOM_IDS.select,
    async execute(interaction: StringSelectMenuInteraction) {
        if (!interaction.isStringSelectMenu()) return;
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, {
            select: "vacation_select",
        });

        try {
            const selected = interaction.values[0];

            log.select.info(meta, `Selected ${selected}`);

            switch (selected) {
                case VACATION_EMBED_CUSTOM_IDS.take: {
                    const canTake = await guardCanTakeVacation(interaction);
                    if (!canTake) {
                        resetSelectMenu(interaction);
                        break;
                    }

                    const modal = take_vacation(interaction.member);
                    await interaction.showModal(modal);
                    resetSelectMenu(interaction);
                    break;
                }

                case VACATION_EMBED_CUSTOM_IDS.leave: {
                    await handleLeaveVacation(interaction, meta);
                    resetSelectMenu(interaction);
                    break;
                }

                case VACATION_EMBED_CUSTOM_IDS.list: {
                    await handleListVacations(interaction, meta);
                    resetSelectMenu(interaction);
                    break;
                }
            }
        } catch (error) {
            log.select.error(meta, "Failed to handle vacation select");
            resetSelectMenu(interaction);
            await safeReply(interaction, error, "vacation_select.execute", interaction.id);
        }
    },
} satisfies StringSelectMenu;

async function guardCanTakeVacation(interaction: StringSelectMenuInteraction<"cached">): Promise<boolean> {
    try {
        resolveVacationConfig(getConfig());
    } catch (error) {
        if (error instanceof VacationConfigError) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setTitle("⚙️ Отпуска пока недоступны")
                        .setDescription(
                            "Похоже, система отпусков ещё не настроена на этом сервере.\nОбратитесь к администрации — они быстро всё поправят.",
                        ),
                ],
                flags: MessageFlags.Ephemeral,
            });
            return false;
        }
        throw error;
    }

    const existing = findActiveVacation(interaction.user.id);
    if (existing) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLOR)
                    .setTitle(`${botAssetsEmojis.vacation} Вы уже в отпуске`)
                    .setDescription(
                        `У вас уже есть активный отпуск — новый оформить пока нельзя.\n\n**Осталось:** ${formatVacationDuration(existing.estimated_end)}`,
                    ),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }

    return true;
}

async function handleLeaveVacation(
    interaction: StringSelectMenuInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const entry = findActiveVacation(interaction.user.id);
    if (!entry) {
        await respond(interaction, {
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLOR)
                    .setDescription("У вас нет активного отпуска."),
            ],
        });
        return;
    }

    try {
        acquireVacationEntryLock(entry.id);
    } catch (error) {
        if (error instanceof Vacation_entry_locked_error) {
            await respond(interaction, { content: error.message });
            return;
        }
        throw error;
    }

    try {
        const vacationRoleId = getConfig().vacation.vacation_role;
        if (!vacationRoleId) {
            await respond(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setDescription("Роль отпуска не настроена. Обратитесь к администратору."),
                ],
            });
            return;
        }

        const rolesRestored = await vacation_role_service.restore(
            interaction.member,
            entry.roles_romeved,
            vacationRoleId,
            entry.id,
        );

        const updated = await vacation_store.update_vacation(entry.id, {
            endedAt: new Date().toISOString(),
            reviewerId: interaction.user.id,
        });

        if (!updated) {
            await respond(interaction, {
                embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription("Не удалось обновить заявку.")],
            });
            return;
        }

        const durationFormatted = formatDuration(entry.startedAt, updated.endedAt!);

        await replyToLogMessage(interaction, meta, updated.log_message, {
            userId: interaction.user.id,
            durationFormatted,
        });

        log.select.info(meta, `Vacation ${entry.id} ended by self-return (${interaction.user.id})`);

        if (!rolesRestored) {
            await respond(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setColor(WARNING_COLOR)
                        .setDescription("⚠️ Отпуск завершён, но роли восстановить не удалось. Обратитесь к администрации."),
                ],
            });
            return;
        }

        await respond(interaction, {
            embeds: [
                new EmbedBuilder()
                    .setColor(SUCCESS_COLOR)
                    .setDescription(`${botAssetsEmojis.active} С возвращением! Ваш отпуск завершён, роли восстановлены.`),
            ],
        });
    } finally {
        releaseVacationEntryLock(entry.id);
    }
}

async function clearLogButtons(
    interaction: StringSelectMenuInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    logMessageId: string | null,
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId || !logMessageId) return;

    try {
        const channel = await interaction.guild.channels.fetch(logChannelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(logMessageId).catch(() => null);
        if (message) {
            await message.edit({ components: [] }).catch(() => null);
        }
    } catch (error) {
        log.select.error(meta, "Failed to clear buttons on vacation log message after self-return", error);
    }
}

async function handleListVacations(
    interaction: StringSelectMenuInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
): Promise<void> {
    const active = listActiveVacations();

    if (active.length === 0) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription("Сейчас никто не в отпуске.")],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const pages = chunk(active, VACATION_LIST_PAGE_SIZE);
    const page = 0;

    await interaction.reply({
        embeds: [buildVacationListEmbed(pages, page, active.length)],
        components: pages.length > 1 ? [vacation_components.listPaginationRow(page, pages.length)] : [],
        flags: MessageFlags.Ephemeral,
    });
}

async function replyToLogMessage(
    interaction: StringSelectMenuInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    logMessageId: string | null,
    info: { userId: string; durationFormatted: string },
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId || !logMessageId) return;

    try {
        const channel = await interaction.guild.channels.fetch(logChannelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(logMessageId).catch(() => null);
        if (!message) return;

        const returnEmbed = new EmbedBuilder()
            .setTitle("Отпуск завершён")
            .setDescription(`<@${info.userId}> вернулся из отпуска`)
            .addFields({ name: "Пробыл в отпуске", value: info.durationFormatted, inline: true })
            .setColor(EMBED_COLOR)
            .setTimestamp();

        await message.reply({ embeds: [returnEmbed] }).catch((error) => {
            log.select.error(meta, "Failed to reply to vacation log message", error);
        });

        await message.edit({ components: [] }).catch(() => null);
    } catch (error) {
        log.select.error(meta, "Failed to reply/clear buttons on vacation log message", error);
    }
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