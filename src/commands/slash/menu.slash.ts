import { ChatInputCommandInteraction, GuildMember, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { manage_menu_embed } from "../../embed/commands/menu.embed";

export default {
    data: new SlashCommandBuilder()
        .setName("menu")
        .setDescription("Управления ботом")
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { command: "menu" });

        try {
            log.command.info(meta, "Deferring reply");
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.command.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "menu.deferReply", interaction.id);
            return;
        }

        try {
            await interaction.editReply({
                components: manage_menu_embed,
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.command.error(meta, "Failed to build/send menu");
            await safeReply(interaction, error, "menu.execute", interaction.id);
        }
    },
} satisfies SlashCommand;