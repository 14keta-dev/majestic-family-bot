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

export const TEMP_VOICE_LIMIT_MODAL_ID = "temp_voice_limit_modal";
export const TEMP_VOICE_LIMIT_INPUT_ID = "temp_voice_limit_input";

const MAX_USER_LIMIT = 99;

export default {
    customId: TEMP_VOICE_BUTTON_IDS.change_limit,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_change_limit" });

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

        const currentLimit = voiceChannel.userLimit;

        const modal = new ModalBuilder()
            .setCustomId(TEMP_VOICE_LIMIT_MODAL_ID)
            .setTitle("Изменение лимита пользователей");

        const limitInput = new TextInputBuilder()
            .setCustomId(TEMP_VOICE_LIMIT_INPUT_ID)
            .setLabel("Лимит пользователей")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`0 — без лимита, макс. ${MAX_USER_LIMIT}`)
            .setValue(String(currentLimit))
            .setMinLength(1)
            .setMaxLength(2)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));

        log.button.info(meta, "Limit modal opened");
        await interaction.showModal(modal);
    },
} satisfies Button;