import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags, PermissionsBitField } from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";

export default {
    customId: TEMP_VOICE_BUTTON_IDS.open_close,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_open_close" })

        const guard_result = await temp_voice_guard(member);

        if (guard_result) {
            log.button.info(meta, `User dosent have acess to edit voice ${guard_result}`)
            await interaction.editReply({ embeds: [guard_result], });
            return;
        };

        try {
            log.button.info(meta, "Button triggered");
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                log.button.error(meta, "User are not in voice channel")
                return;
            }

            const everyoneRole = interaction.guild.roles.everyone;
            const currentOverwrite = voiceChannel.permissionOverwrites.cache.get(everyoneRole.id);
            const isCurrentlyClosed = currentOverwrite?.deny.has(PermissionsBitField.Flags.Connect) ?? false;

            if (isCurrentlyClosed) {
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: null });

                log.button.info(meta, `Voice channel opened`)
                await interaction.editReply({ embeds: [new EmbedBuilder().setDescription("> Канал открыт")] });
            } else {
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });

                log.button.info(meta, `Voice channel closed`)
                await interaction.editReply({ embeds: [new EmbedBuilder().setDescription("> Канал закрыт")] });
            }
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to toggle open/close for temp voice: ${error}`)
            console.error(error);
            await interaction.editReply({ content: "Произошла ошибка попробуйте через пару секунда" });
        }
    }
} satisfies Button;