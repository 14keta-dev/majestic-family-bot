// embed/bacpack/missing.embed.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    GuildMember,
    MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../commands/menu.embed";

const BASE_URL = "embed:manage:backpack:missing";
export const PAGE_SIZE = 5;

export const MISSING_BACKPACK_CUSTOM_IDS = {
    open: BASE_URL,
    page: (page: number) => `${BASE_URL}:page:${page}`,
    back: MANAGE_MENU_CUSTOM_ID.backpack,
} as const;

interface Missing_backpack_embed_props {
    members: GuildMember[];
    page: number;
}

export const missing_backpack_embed = ({ members, page }: Missing_backpack_embed_props) => {
    const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);

    const start = safePage * PAGE_SIZE;
    const pageMembers = members.slice(start, start + PAGE_SIZE);

    const lines = pageMembers.length
        ? pageMembers.map((member, i) => `**${start + i + 1}.** <@${member.id}>`)
        : ["Все участники семьи имеют бэкпак."];

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Без папки (${members.length})`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const navRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    if (totalPages > 1) {
        navRow.addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel("◀")
                .setCustomId(MISSING_BACKPACK_CUSTOM_IDS.page(safePage - 1))
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`${safePage + 1} / ${totalPages}`)
                .setCustomId(`${BASE_URL}:noop`)
                .setDisabled(true),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel("▶")
                .setCustomId(MISSING_BACKPACK_CUSTOM_IDS.page(safePage + 1))
                .setDisabled(safePage >= totalPages - 1),
        );
    }

    navRow.addComponents(
        new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Назад")
            .setCustomId(MISSING_BACKPACK_CUSTOM_IDS.back),
    );

    container.addActionRowComponents(navRow);

    return [container];
};