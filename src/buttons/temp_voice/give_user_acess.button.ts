import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    UserSelectMenuBuilder,
    UserSelectMenuInteraction,
} from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

const CUSTOM_IDS = {
    select: "temp_voice_give_access_select",
};

function buildComponents() {
    const select = new UserSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.select)
        .setPlaceholder("Выберите пользователей, которым хотите дать доступ")
        .setMinValues(1)
        .setMaxValues(25);

    return [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)];
}

export default {
    customId: TEMP_VOICE_BUTTON_IDS.give_user_acess,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_give_user_access" });

        const guard_result = await temp_voice_guard(member);

        if (guard_result) {
            log.button.info(meta, `User dosent have acess to edit voice ${guard_result}`);
            await interaction.editReply({ embeds: [guard_result] });
            return;
        }

        try {
            log.button.info(meta, "Button triggered");

            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                log.button.error(meta, "User are not in voice channel");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> Вы должны находиться в голосовом канале")],
                });
                return;
            }

            const reply = await interaction.editReply({
                embeds: [
                    new EmbedBuilder().setDescription(
                        "> Выберите пользователей, которым хотите дать доступ к каналу (даже если он скрыт или закрыт)"
                    ),
                ],
                components: buildComponents(),
            });

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 5 * 60_000,
            });

            collector.on("collect", async (i) => {
                try {
                    if (i.customId !== CUSTOM_IDS.select) return;

                    const selectInteraction = i as UserSelectMenuInteraction;
                    const selectedUsers = [...selectInteraction.users.values()];

                    if (selectedUsers.length === 0) {
                        await selectInteraction.update({
                            embeds: [new EmbedBuilder().setDescription("> Пользователи не выбраны")],
                            components: buildComponents(),
                        });
                        return;
                    }

                    for (const user of selectedUsers) {
                        await voiceChannel.permissionOverwrites.edit(user.id, {
                            ViewChannel: true,
                            Connect: true,
                        });
                    }

                    log.button.info(
                        meta,
                        `${member.user.tag} granted access to [${selectedUsers.map((u) => u.tag).join(", ")}]`
                    );

                    const namesList = selectedUsers.map((u) => `**${u.username}**`).join(", ");

                    await selectInteraction.update({
                        embeds: [
                            new EmbedBuilder().setDescription(`> ${botAssetsEmojis.active} Доступ к каналу предоставлен: ${namesList}`),
                        ],
                        components: buildComponents(),
                    });
                } catch (error) {
                    log.button.error(meta, `Error handling give access interaction: ${error}`);
                    if (!i.replied && !i.deferred) {
                        await i
                            .update({
                                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
                                components: buildComponents(),
                            })
                            .catch(() => { });
                    }
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => { });
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to give user access for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Button;