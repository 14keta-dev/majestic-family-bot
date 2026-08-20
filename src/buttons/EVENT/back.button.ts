import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { MANAGE_EVENT_EMBED_CUSTOM_IDS, manage_mp_embed } from "../../embed/EVENT/manage.embed";

export default {
    customId: MANAGE_EVENT_EMBED_CUSTOM_IDS.back_mp,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;


        try {
            await interaction.update({
                components: manage_mp_embed(),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {

        }
    }
} satisfies Button;