import {
    AnySelectMenuInteraction,
    StringSelectMenuInteraction,
    RoleSelectMenuInteraction,
    UserSelectMenuInteraction,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
} from "discord.js";

export interface SelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: AnySelectMenuInteraction) => Promise<void>;
}


export interface StringSelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

export interface RoleSelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: RoleSelectMenuInteraction) => Promise<void>;
}

export interface UserSelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: UserSelectMenuInteraction) => Promise<void>;
}

export interface ChannelSelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: ChannelSelectMenuInteraction) => Promise<void>;
}

export interface MentionableSelectMenu {
    customId: string | RegExp;
    dynamic?: boolean;
    defer?: boolean;
    execute: (interaction: MentionableSelectMenuInteraction) => Promise<void>;
}