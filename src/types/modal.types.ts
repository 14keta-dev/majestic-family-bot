
import { ModalSubmitInteraction } from "discord.js";
export interface Modal {
    customId: string | RegExp;
    dynamic?: boolean; 
    defer?: boolean;
    ephemeralDefer?: boolean;
    execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}