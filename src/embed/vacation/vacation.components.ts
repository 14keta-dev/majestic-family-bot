import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { VACATION_LIST_PAGINATION_CUSTOM_ID } from "./vacation.embed";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

export const VACATION_REVIEW_CUSTOM_IDS = {
    accept: "embed:vacation:vacation_request:accept",
    reject: "embed:vacation:vacation_request:reject",
    kick: "embed:vacation:vacation_request:kick",
} as const;

export const vacation_components = {
    reviewRow(entryId: string): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${VACATION_REVIEW_CUSTOM_IDS.accept}:${entryId}`)
                .setLabel("Принять")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`${VACATION_REVIEW_CUSTOM_IDS.reject}:${entryId}`)
                .setLabel("Отклонить")
                .setStyle(ButtonStyle.Danger),
        );
    },

    kickRow(entryId: string): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${VACATION_REVIEW_CUSTOM_IDS.kick}:${entryId}`)
                .setLabel("Выгнать")
                .setStyle(ButtonStyle.Danger),
        );
    },

    listPaginationRow(page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${VACATION_LIST_PAGINATION_CUSTOM_ID.prev}:${page}`)
                .setEmoji(botAssetsEmojis.prev)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`${VACATION_LIST_PAGINATION_CUSTOM_ID.next}:${page}`)
                .setEmoji(botAssetsEmojis.next)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1),
        );
    },
};