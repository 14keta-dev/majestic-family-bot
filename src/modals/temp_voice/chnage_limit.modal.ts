import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";
import { TEMP_VOICE_LIMIT_INPUT_ID, TEMP_VOICE_LIMIT_MODAL_ID } from "../../buttons/temp_voice/change_limit.button";

const MAX_USER_LIMIT = 99;

export default {
    customId: TEMP_VOICE_LIMIT_MODAL_ID,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { modal: "temp_voice_change_limit" });

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

            const rawValue = interaction.fields.getTextInputValue(TEMP_VOICE_LIMIT_INPUT_ID).trim();
            const limit = Number(rawValue);

            if (!Number.isInteger(limit) || Number.isNaN(limit)) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Введите корректное число")],
                });
                return;
            }

            if (limit < 0 || limit > MAX_USER_LIMIT) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `> Лимит должен быть от **0** (без лимита) до **${MAX_USER_LIMIT}**`
                        ),
                    ],
                });
                return;
            }

            await voiceChannel.setUserLimit(limit, `User limit changed by ${member.user.tag}`);

            log.button.info(meta, `${member.user.tag} set user limit to ${limit}`);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder().setDescription(
                        limit === 0
                            ? "> 👥 Лимит пользователей снят"
                            : `> 👥 Лимит пользователей установлен на **${limit}**`
                    ),
                ],
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to change user limit for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Modal;