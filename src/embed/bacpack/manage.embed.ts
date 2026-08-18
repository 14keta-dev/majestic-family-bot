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
import { backpack_interface } from "../../utils/config/backpack";
import { Backpack_channel } from "../../utils/backpack/backpack.schema";
import { MISSING_BACKPACK_CUSTOM_IDS } from "./missing.embed";

const BASE_URL = "embed:manage:backpack";

export const MANAGE_BACKPACK_CUSTOM_IDS = {
    edit: `${BASE_URL}:edit`,
} as const;

interface Manage_backpack_embed_props {
    backpack_config: backpack_interface;
    backpacks: Backpack_channel[];
    familyMemberCount?: number;
    missingBackpackCount?: number;
}

export const manage_backpack_embed = ({
    backpack_config,
    backpacks,
    familyMemberCount = 0,
    missingBackpackCount = 0,
}: Manage_backpack_embed_props) => {

    const lines = [
        `**Канал панели -** <#${backpack_config.panel_channel}>`,
        `**Роли модерации -** ${backpack_config.allowed_roles?.length ? backpack_config.allowed_roles.map((id) => `<@&${id}>`).join(", ") : "не настроены"}`,
        `**Всего каналов -** ${backpacks.length}`,
        `**Участников семьи -** ${familyMemberCount}`,
        `**Без папки -** ${missingBackpackCount} из ${familyMemberCount}`,
    ];

    const buttons = [
        new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Изменить Настройки")
            .setCustomId(MANAGE_BACKPACK_CUSTOM_IDS.edit),
    ];

    if (missingBackpackCount > 0) {
        buttons.push(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel(`Без папки (${missingBackpackCount})`)
                .setCustomId(MISSING_BACKPACK_CUSTOM_IDS.open),
        );
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Управление бэкпаками"))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...buttons),
        );

    return [container];
};