import { ActionRowBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextDisplayBuilder } from "discord.js";
import { botAssetsEmojis } from "../../../utils/emojis/emojis";

const BASE_URL = "embed:event:manage"

export const MANAGE_EVENT_CUSTOM_IDS = {
    select: `${BASE_URL}:select`,
}

export const MANAGE_EVENT_ACTIONS = {
    edit: "edit",
    remind_thread: "remind_thread",
    remind_dm: "remind_dm",
    open: "open",
    close: "close",
    add_to_main: "add_to_main",
    add_to_replacement: "add_to_replacement",
    remove_from_main: "remove_from_main",
    remove_from_replacement: "remove_from_replacement",
    end: "end",
} as const;

export type ManageEventAction = typeof MANAGE_EVENT_ACTIONS[keyof typeof MANAGE_EVENT_ACTIONS];

export const manage_event_embed = ({ id, open }: { id: string, open: boolean }) => {

    const toggle_option = open
        ? new StringSelectMenuOptionBuilder()
            .setLabel("Закрыть регистрацию")
            .setDescription("Остановить приём новых участников")
            .setEmoji(botAssetsEmojis.dot)
            .setValue(MANAGE_EVENT_ACTIONS.close)
        : new StringSelectMenuOptionBuilder()
            .setLabel("Открыть регистрацию")
            .setDescription("Снова разрешить запись")
            .setEmoji(botAssetsEmojis.dot)
            .setValue(MANAGE_EVENT_ACTIONS.open);

    const select = new StringSelectMenuBuilder()
        .setCustomId(`${MANAGE_EVENT_CUSTOM_IDS.select}:${id}`)
        .setPlaceholder("Выберите действие")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Редактировать")
                .setDescription("Изменить описание, время или огран")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.edit),
            new StringSelectMenuOptionBuilder()
                .setLabel("Напомнить в ветке")
                .setDescription("Отправить напоминание в ветку сбора")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.remind_thread),
            new StringSelectMenuOptionBuilder()
                .setLabel("Напомнить в ЛС")
                .setDescription("Отправить напоминание участникам в личные сообщения")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.remind_dm),
            toggle_option,
            new StringSelectMenuOptionBuilder()
                .setLabel("Добавить в основной список")
                .setDescription("Вручную добавить участника")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.add_to_main),
            new StringSelectMenuOptionBuilder()
                .setLabel("Добавить в запасной список")
                .setDescription("Вручную добавить в список ожидания")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.add_to_replacement),
            new StringSelectMenuOptionBuilder()
                .setLabel("Удалить из основного списка")
                .setDescription("Вручную убрать участника")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.remove_from_main),
            new StringSelectMenuOptionBuilder()
                .setLabel("Удалить из запасного списка")
                .setDescription("Вручную убрать из списка ожидания")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.remove_from_replacement),
            new StringSelectMenuOptionBuilder()
                .setLabel("Завершить")
                .setDescription("Закрыть и заархивировать сбор")
                .setEmoji(botAssetsEmojis.dot)
                .setValue(MANAGE_EVENT_ACTIONS.end),
        );

    const manage_embed =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Управления сбором"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            );

    return [manage_embed]
}