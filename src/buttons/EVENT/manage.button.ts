import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../../embed/commands/menu.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { create_mp_modal } from "../../utils/EVENT/create_event_type";
import { manage_mp_embed } from "../../embed/EVENT/manage.embed";

export default {
    customId: MANAGE_MENU_CUSTOM_ID.event,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;


        const config = getConfig().event;

        try {
            if (config.length < 1) {
                const modal = create_mp_modal();
                await interaction.showModal(modal)
                return;
            }

            const container = manage_mp_embed();

            await interaction.update({
                components: container,
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        } catch (error) {

        }
    }
} satisfies Button;