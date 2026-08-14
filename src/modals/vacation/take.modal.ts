import { GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { TAKE_VACATION_MODAL_CUSTOM_ID } from "../../utils/vacation/handle_take.helper";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { getConfig } from "../../utils/config/store";
import {
    Already_on_vacation_error,
    formatVacationDuration,
    Invalid_vacation_date_error,
    Invalid_vacation_duration_error,
    Vacation_schema,
    vacation_store,
} from "../../utils/vacation/vacation.schema";
import { ControlledVacationConfig, LoggedVacationConfig, resolveVacationConfig } from "../../utils/vacation/config";
import { vacation_embeds, VacationSummary } from "../../embed/vacation/vacation_interaction.embed";
import { vacation_role_service } from "../../utils/vacation/remove_roles";
import { respond } from "../../utils/vacation/respond.helper";
import { vacation_components } from "../../embed/vacation/vacation.components";
import { VacationConfigError, VacationDeliveryError, VacationRoleError } from "../../utils/vacation/errors";

export default {
    customId: TAKE_VACATION_MODAL_CUSTOM_ID.modal,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { modal: "take_vacation_modal" });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let entry: Vacation_schema | null = null;
        let removedRoleIds: string[] = [];
        let vacationRoleId: string | null = null;

        try {
            const config = resolveVacationConfig(getConfig());
            vacationRoleId = config.vacationRoleId;

            const { reason, durationInput } = readModalInputs(interaction);

            entry = await vacation_store.enter_vacation({
                userId: interaction.user.id,
                reason,
                estimated_end_input: durationInput,
                roles_romeved: [],
                log_message: "",
            });
            log.modal.info(meta, "Vacation entry created");


            if (!config.controlled) {
                removedRoleIds = await vacation_role_service.apply(interaction.member, entry.id, config.vacationRoleId);
            }

            const summary: VacationSummary = {
                userId: interaction.user.id,
                reason,
                durationText: formatVacationDuration(entry.estimated_end),
                removedRoleCount: removedRoleIds.length,
            };

            const logMessageId = config.controlled
                ? await deliverControlledRequest(interaction, entry.id, config, summary)
                : await deliverVacationLog(interaction, entry.id, config, summary);

            await vacation_store.update_vacation(entry.id, {
                log_message: logMessageId,
                roles_romeved: removedRoleIds,
            });

            await respond(interaction, {
                content: config.controlled
                    ? "Запрос на отпуск отправлен на рассмотрение."
                    : "Отпуск оформлен.",
            });
        } catch (error) {
            await handleVacationFailure(interaction, meta, error, {
                entry,
                removedRoleIds,
                vacationRoleId,
                member: interaction.member,
            });
        }
    },
};

function readModalInputs(interaction: ModalSubmitInteraction) {
    return {
        durationInput: interaction.fields.getTextInputValue(TAKE_VACATION_MODAL_CUSTOM_ID.duration).trim(),
        reason: interaction.fields.getTextInputValue(TAKE_VACATION_MODAL_CUSTOM_ID.reason).trim(),
    };
}

async function deliverControlledRequest(
    interaction: ModalSubmitInteraction<"cached">,
    entryId: string,
    config: ControlledVacationConfig,
    summary: VacationSummary,
): Promise<string> {
    try {
        const channel = await interaction.guild.channels.fetch(config.incomingRequestChannelId);
        if (!channel?.isTextBased()) {
            throw new Error("Vacation incoming_request channel is not text based");
        }

        const message = await channel.send({
            content: config.pingRoleIds.length ? config.pingRoleIds.map((r) => `<@&${r}>`).join(" ") : undefined,
            embeds: [vacation_embeds.request(summary)],
            components: [vacation_components.reviewRow(entryId)],
        });

        return message.id;
    } catch (error) {
        throw new VacationDeliveryError("Failed to send vacation request to review channel", error);
    }
}

async function deliverVacationLog(
    interaction: ModalSubmitInteraction<"cached">,
    entryId: string,
    config: LoggedVacationConfig,
    summary: VacationSummary,
): Promise<string> {
    try {
        const channel = await interaction.guild.channels.fetch(config.logChannelId);
        if (!channel?.isTextBased()) {
            throw new Error("Vacation log channel is not text based");
        }

        const message = await channel.send({
            embeds: [vacation_embeds.approved(summary)],
            components: [vacation_components.kickRow(entryId)],
        });

        return message.id;
    } catch (error) {
        throw new VacationDeliveryError("Failed to send vacation log message", error);
    }
}


async function handleVacationFailure(
    interaction: ModalSubmitInteraction,
    meta: ReturnType<typeof metaBuilder>,
    error: unknown,
    ctx: {
        entry: Vacation_schema | null;
        removedRoleIds: string[];
        vacationRoleId: string | null;
        member: GuildMember;
    },
): Promise<void> {
    if (
        error instanceof Invalid_vacation_date_error ||
        error instanceof Invalid_vacation_duration_error ||
        error instanceof Already_on_vacation_error
    ) {
        await respond(interaction, { content: error.message }).catch(() => { });
        return;
    }

    log.modal.error(meta, describeVacationFailure(error), error);

    if (ctx.entry) {
        if (ctx.removedRoleIds.length > 0 && ctx.vacationRoleId) {
            await vacation_role_service
                .restore(ctx.member, ctx.removedRoleIds, ctx.vacationRoleId, ctx.entry.id)
                .catch(() => { });
        }
        await vacation_store.delete_vacation(ctx.entry.id).catch(() => { });
    }

    if (error instanceof VacationRoleError) {
        await respond(interaction, {
            embeds: [vacation_embeds.error("Не удалось снять роли. Попробуйте через пару секунд")],
        }).catch(() => { });
        return;
    }

    if (error instanceof VacationDeliveryError) {
        await respond(interaction, {
            embeds: [vacation_embeds.error("Попробуйте через пару секунд")],
        }).catch(() => { });
        return;
    }

    await respond(interaction, {
        content: "Произошла непредвиденная ошибка. Попробуйте через пару секунд.",
    }).catch(() => { });
}

function describeVacationFailure(error: unknown): string {
    if (error instanceof VacationConfigError) return "Vacation config invalid";
    if (error instanceof VacationRoleError) return "Failed to remove/assign vacation roles";
    if (error instanceof VacationDeliveryError) return "Failed to deliver vacation request/log message";
    return "Failed to create vacation entry";
}