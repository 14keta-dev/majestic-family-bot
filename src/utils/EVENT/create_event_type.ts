import { ChannelType, ChannelSelectMenuBuilder, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, RoleSelectMenuBuilder } from "discord.js";
import { EventConfig } from "../config/EVENT";


export const CREATE_EVENT_CUSTOM_IDS = {
    modal: "modal:create_event",
    name_input: "modal:create_event:name:input",
    create_channel: "modal:create_event:create_channel:input",
    tag_channel: "modal:create_event:tag_channel:input",
    replay_channel: "modal:create_event:replay_channel:input",
    allowed_roles: "modal:create_event:allowed_roles:input"
}

export const EDIT_EVENT_CUSTOM_IDS = {
    modal: "modal:edit_mp", // prefix, mp name appended as :<name>
}

export const build_edit_mp_modal_id = (name: string) => `${EDIT_EVENT_CUSTOM_IDS.modal}:${name}`;

export const create_mp_modal = (mp?: EventConfig) => {
    const name_input = new TextInputBuilder()
        .setCustomId(CREATE_EVENT_CUSTOM_IDS.name_input)
        .setRequired(true)
        .setMinLength(3)
        .setStyle(TextInputStyle.Short);

    const create_channel_input = new ChannelSelectMenuBuilder()
        .setCustomId(CREATE_EVENT_CUSTOM_IDS.create_channel)
        .setChannelTypes(ChannelType.GuildText)
        .setRequired(true)
        .setMinValues(1)
        .setMaxValues(1);

    const tag_channel_input = new ChannelSelectMenuBuilder()
        .setCustomId(CREATE_EVENT_CUSTOM_IDS.tag_channel)
        .setChannelTypes(ChannelType.GuildText)
        .setRequired(true)
        .setMaxValues(1)
        .setMinValues(1);

    const replay_channel_input = new ChannelSelectMenuBuilder()
        .setCustomId(CREATE_EVENT_CUSTOM_IDS.replay_channel)
        .setChannelTypes(ChannelType.GuildText)
        .setRequired(true)
        .setMaxValues(1)
        .setMinValues(1);

    const allowed_roles_input = new RoleSelectMenuBuilder()
        .setCustomId(CREATE_EVENT_CUSTOM_IDS.allowed_roles)
        .setMinValues(1)
        .setMaxValues(25)
        .setRequired(true);

    if (mp) {
        name_input.setValue(mp.name);
        create_channel_input.setDefaultChannels(mp.create_channel);
        tag_channel_input.setDefaultChannels(mp.tag_channel);
        replay_channel_input.setDefaultChannels(mp.replay_channel);
        allowed_roles_input.setDefaultRoles(mp.allowed_roles);
    }

    const modal = new ModalBuilder()
        .setCustomId(mp ? build_edit_mp_modal_id(mp.name) : CREATE_EVENT_CUSTOM_IDS.modal)
        .setTitle(mp ? "Изменить МП" : "Создать новое мп")
        .addLabelComponents(
            new LabelBuilder()
                .setLabel("Названия МП")
                .setTextInputComponent(name_input),
            new LabelBuilder()
                .setLabel("Канал создания")
                .setChannelSelectMenuComponent(create_channel_input),
            new LabelBuilder()
                .setLabel("Канал тегов")
                .setChannelSelectMenuComponent(tag_channel_input),
            new LabelBuilder()
                .setLabel("Канал Откатов")
                .setChannelSelectMenuComponent(replay_channel_input),
            new LabelBuilder()
                .setLabel("Роли модерации")
                .setRoleSelectMenuComponent(allowed_roles_input)
        );

    return modal;
}