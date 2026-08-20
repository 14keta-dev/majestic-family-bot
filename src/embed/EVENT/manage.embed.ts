import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";
import { getConfig } from "../../utils/config/store";
import { EventConfig } from "../../utils/config/EVENT";

export const MANAGE_EVENT_EMBED_CUSTOM_IDS = {
    view_mp: `embed:manage_mp:view`,
    add_mp: `embed:manage_mp:add`,
    manage_mp: `embed:manage_mp:manage`,   
    edit_mp: `embed:manage_mp:edit`,
    delete_mp: `embed:manage_mp:delete`,
    back_mp: `embed:manage_mp:back`,
}

export const build_manage_mp_id = (name: string) => `${MANAGE_EVENT_EMBED_CUSTOM_IDS.manage_mp}:${name}`;
export const build_edit_mp_id = (name: string) => `${MANAGE_EVENT_EMBED_CUSTOM_IDS.edit_mp}:${name}`;
export const build_delete_mp_id = (name: string) => `${MANAGE_EVENT_EMBED_CUSTOM_IDS.delete_mp}:${name}`;

export const manage_mp_embed = () => {
    const config = getConfig().event;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "## Управление МП\nВыберите тип MP ниже для управления им или добавьте новый."
        )
    );

    if (config.length < 1) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No MP types have been created yet.")
        );
    } else {
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

        for (const mp of config) {
            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${mp.name}**`)
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(build_manage_mp_id(mp.name))
                            .setLabel("Настройки")
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
        }
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(MANAGE_EVENT_EMBED_CUSTOM_IDS.add_mp)
                .setLabel("Добавить МП")
                .setStyle(ButtonStyle.Success)
        )
    );

    return [container];
}

export const manage_mp_details_embed = (mp: EventConfig, guildId: string) => {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## Настройки МП: ${mp.name}`)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                `**Канал создания:** <#${mp.create_channel}>`,
                `**Канал тегов:** <#${mp.tag_channel}>`,
                `**Канал повторов:** <#${mp.replay_channel}>`,
                `**Разрешённые роли:** ${mp.allowed_roles.length > 0
                    ? mp.allowed_roles.map((r) => `<@&${r}>`).join(", ")
                    : "—"
                }`,
                `**Сообщение создания:** [Перейти к сообщению](https://discord.com/channels/${guildId}/${mp.create_channel}/${mp.create_message})`,
            ].join("\n")
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(build_edit_mp_id(mp.name))
                .setLabel("Изменить")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(build_delete_mp_id(mp.name))
                .setLabel("Удалить")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(MANAGE_EVENT_EMBED_CUSTOM_IDS.back_mp)
                .setLabel("Назад")
                .setStyle(ButtonStyle.Secondary)
        )
    );

    return [container];
}