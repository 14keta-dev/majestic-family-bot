import { PermissionFlagsBits, MessageFlags } from "discord.js";
import type { ButtonInteraction, AnySelectMenuInteraction, Message } from "discord.js";

type GuildComponentInteraction = ButtonInteraction | AnySelectMenuInteraction;

export async function requireManageGuild(interaction: GuildComponentInteraction): Promise<boolean> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: "У вас недостаточно прав для этого действия.",
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }
    return true;
}

export async function requireManageGuildMessage(message: Message<true>): Promise<boolean> {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply("У вас недостаточно прав для этого действия.");
        return false;
    }
    return true;
}