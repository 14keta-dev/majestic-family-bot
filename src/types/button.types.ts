import { ButtonInteraction } from "discord.js";

export interface Button {
    customId: string | RegExp;
    defer?: boolean;
    ephemeralDefer?: boolean;
    deferUpdate?: boolean;
    dynamic?: boolean;
    execute: (interaction: ButtonInteraction) => Promise<void>;
}