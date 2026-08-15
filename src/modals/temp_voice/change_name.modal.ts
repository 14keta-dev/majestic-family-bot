import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";
import { TEMP_VOICE_NAME_INPUT_ID, TEMP_VOICE_NAME_MODAL_ID } from "../../buttons/temp_voice/change_name.button";

export default {
    customId: TEMP_VOICE_NAME_MODAL_ID,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { modal: "temp_voice_change_name" });

        const guard_result = await temp_voice_guard(member);

        if (guard_result) {
            log.button.info(meta, `User dosent have acess to edit voice ${guard_result}`);
            await interaction.editReply({ embeds: [guard_result] });
            return;
        }

        try {
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                log.button.error(meta, "User are not in voice channel");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Вы должны находиться в голосовом канале")],
                });
                return;
            }

            const rawValue = interaction.fields.getTextInputValue(TEMP_VOICE_NAME_INPUT_ID).trim();

            if (rawValue.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Название не может быть пустым")],
                });
                return;
            }

            if (rawValue.length > 100) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Название не может быть длиннее **100** символов")],
                });
                return;
            }

            await voiceChannel.setName(rawValue, `Channel renamed by ${member.user.tag}`);

            log.button.info(meta, `${member.user.tag} renamed channel ${voiceChannel.id} to "${rawValue}"`);

            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription(`> Название канала изменено на **${rawValue}**`)],
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to change name for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Modal;