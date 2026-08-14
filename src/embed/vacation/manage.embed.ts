import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";
import { Vacation_config } from "../../utils/config/vacation";

const BASE_URL = "embed:manage:vacation";

export const MANAGE_VACATION_CUSTOM_IDS = {
    edit: `${BASE_URL}:edit`,
} as const;

export const manage_vacation_embed = (vacation: Vacation_config) => {
    const lines = [
        `**Тип -** ${vacation.controlled ? "Контролируемый" : "Свободный"}`,
        `**Роль отпуска -** <@&${vacation.vacation_role}>`,
        `**Канал панели -** <#${vacation.panel_channel}>`,
    ];

    if (vacation.controlled) {
        lines.push(
            `**Пинг роли -** ${vacation.ping_role?.length ? vacation.ping_role.map((id) => `<@&${id}>`).join(", ") : "не настроены"}`,
            `**Канал входящих -** ${vacation.incoming_request ? `<#${vacation.incoming_request}>` : "не настроен"}`,
        );
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Управление отпусками"))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Изменить Настройки")
                    .setCustomId(MANAGE_VACATION_CUSTOM_IDS.edit),
            ),
        );

    return [container];
};