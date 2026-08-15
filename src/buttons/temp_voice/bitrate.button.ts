import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";

export const TEMP_VOICE_BITRATE_MODAL_ID = "temp_voice_bitrate_modal";
export const TEMP_VOICE_BITRATE_INPUT_ID = "temp_voice_bitrate_input";

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
    customId: TEMP_VOICE_BUTTON_IDS.change_bitrate,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_change_bitrate" });

        const guard_result = await temp_voice_guard(member);

        if (guard_result) {
            log.button.info(meta, `User dosent have acess to edit voice ${guard_result}`);
            await interaction.reply({ embeds: [guard_result], flags: MessageFlags.Ephemeral });
            return;
        }

        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            log.button.error(meta, "User are not in voice channel");
            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription("> Вы должны находиться в голосовом канале")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const maxBitrate = getMaxBitrateKbps(interaction.guild.premiumTier);
        const currentBitrate = Math.round(voiceChannel.bitrate / 1000);

        const modal = new ModalBuilder()
            .setCustomId(TEMP_VOICE_BITRATE_MODAL_ID)
            .setTitle("Изменение битрейта");

        const bitrateInput = new TextInputBuilder()
            .setCustomId(TEMP_VOICE_BITRATE_INPUT_ID)
            .setLabel(`Битрейт в кбит/с (от 8 до ${maxBitrate})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Например: 64`)
            .setValue(String(currentBitrate))
            .setMinLength(1)
            .setMaxLength(3)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(bitrateInput));

        log.button.info(meta, "Bitrate modal opened");
        await interaction.showModal(modal);
    },
} satisfies Button;