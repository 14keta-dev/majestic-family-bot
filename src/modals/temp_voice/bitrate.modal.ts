import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";
import { TEMP_VOICE_BITRATE_INPUT_ID, TEMP_VOICE_BITRATE_MODAL_ID } from "../../buttons/temp_voice/bitrate.button";

function getMaxBitrateKbps(premiumTier: number) {
    switch (premiumTier) {
        case 3:
            return 384;
        case 2:
            return 256;
        case 1:
            return 128;
        default:
            return 96;
    }
}

export default {
    customId: TEMP_VOICE_BITRATE_MODAL_ID,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { modal: "temp_voice_change_bitrate" });

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

            const rawValue = interaction.fields.getTextInputValue(TEMP_VOICE_BITRATE_INPUT_ID).trim();
            const bitrateKbps = Number(rawValue);

            const maxBitrate = getMaxBitrateKbps(interaction.guild.premiumTier);

            if (!Number.isInteger(bitrateKbps) || Number.isNaN(bitrateKbps)) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Введите корректное число")],
                });
                return;
            }

            if (bitrateKbps < 8 || bitrateKbps > maxBitrate) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `> Битрейт должен быть от **8** до **${maxBitrate}** кбит/с`
                        ),
                    ],
                });
                return;
            }

            await voiceChannel.setBitrate(bitrateKbps * 1000, `Bitrate changed by ${member.user.tag}`);

            log.button.info(meta, `${member.user.tag} set bitrate to ${bitrateKbps}kbps`);

            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription(`> Битрейт установлен на **${bitrateKbps} кбит/с**`)],
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to change bitrate for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Modal;