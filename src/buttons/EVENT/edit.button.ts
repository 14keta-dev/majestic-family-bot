import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { MANAGE_EVENT_EMBED_CUSTOM_IDS } from "../../embed/EVENT/manage.embed";
import { create_mp_modal } from "../../utils/EVENT/create_event_type";

export default {
    customId: MANAGE_EVENT_EMBED_CUSTOM_IDS.edit_mp,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember);

        const name = interaction.customId.slice(MANAGE_EVENT_EMBED_CUSTOM_IDS.edit_mp.length + 1);
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
            const modal = create_mp_modal(mp);
            await interaction.showModal(modal);
        } catch (error) {

        }
    }
} satisfies Button;