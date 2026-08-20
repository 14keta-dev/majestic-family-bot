import { ButtonInteraction, GuildMember } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { MANAGE_EVENT_EMBED_CUSTOM_IDS } from "../../embed/EVENT/manage.embed";
import { create_mp_modal } from "../../utils/EVENT/create_event_type";

export default {
    customId: MANAGE_EVENT_EMBED_CUSTOM_IDS.add_mp,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        try {
            const modal = create_mp_modal();
            await interaction.showModal(modal);
        } catch (error) {

        }
    }
} satisfies Button;