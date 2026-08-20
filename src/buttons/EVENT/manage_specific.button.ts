import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { MANAGE_EVENT_EMBED_CUSTOM_IDS, manage_mp_details_embed } from "../../embed/EVENT/manage.embed";

export default {
    customId: MANAGE_EVENT_EMBED_CUSTOM_IDS.manage_mp,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember);

        const name = interaction.customId.slice(MANAGE_EVENT_EMBED_CUSTOM_IDS.manage_mp.length + 1); // +1 for the ':'
        const config = getConfig().event;
        const mp = config.find((m) => m.name === name);

        if (!mp) {
            await interaction.reply({
                content: "Этот тип MP больше не существует.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            const container = manage_mp_details_embed(mp, interaction.guild.id);

            await interaction.update({
                components: container,
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {

        }
    }
} satisfies Button;