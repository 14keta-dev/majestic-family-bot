import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";

export default {
    customId: TEMP_VOICE_BUTTON_IDS.remove_slot,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_remove_slot" })

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

            const currentLimit = voiceChannel.userLimit; // 0 = unlimited

            if (currentLimit === 0) {
                log.button.info(meta, `Limit is already unlimited - aborting`)
                await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Лимит участников не установлен")] });
                return;
            }

            const currentMembers = voiceChannel.members.size;
            const newLimit = currentLimit - 1;

            if (newLimit < currentMembers) {
                log.button.info(meta, `New limit ${newLimit} would be below current member count ${currentMembers} - aborting`)
                await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Нельзя установить лимит меньше текущего числа участников")] });
                return;
            }

            await voiceChannel.setUserLimit(newLimit);

            log.button.info(meta, `New limit to voice is set: ${newLimit}:${currentLimit}`)
            await interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`> Лимит установлен \`${newLimit}\``)] });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to decrease limit for temp voice users: ${error}`)
            console.error(error);
            await interaction.editReply({ content: "Произошла ошибка попробуйте через пару секунда" });
        }
    }
} satisfies Button;