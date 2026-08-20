import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig, updateConfig } from "../../utils/config/store";
import { log } from "../../utils/logger";
import { MANAGE_EVENT_EMBED_CUSTOM_IDS, manage_mp_embed } from "../../embed/EVENT/manage.embed";

export default {
    customId: MANAGE_EVENT_EMBED_CUSTOM_IDS.delete_mp,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember);

        const name = interaction.customId.slice(MANAGE_EVENT_EMBED_CUSTOM_IDS.delete_mp.length + 1);
        const config = getConfig().event;
        const index = config.findIndex((m) => m.name === name);

        if (index === -1) {
            await interaction.reply({
                content: "Этот тип MP больше не существует.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const mp = config[index];

        try {
            try {
                const channel = await interaction.guild.channels.fetch(mp.create_channel);
                if (channel?.isTextBased()) {
                    const message = await channel.messages.fetch(mp.create_message);
                    await message.delete();
                }
            } catch (error) {
                log.button.error(meta, error, "Failed to delete create_mp panel message on removal");
            }

            const updated = config.filter((_, i) => i !== index);
            await updateConfig({ event: updated });

            await interaction.update({
                components: manage_mp_embed(),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {

        }
    }
} satisfies Button;