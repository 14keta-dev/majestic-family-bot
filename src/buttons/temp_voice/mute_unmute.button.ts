import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";

const PAGE_SIZE = 25;

const CUSTOM_IDS = {
    select: "temp_voice_mute_select",
    prev: "temp_voice_mute_page_prev",
    next: "temp_voice_mute_page_next",
};

function buildComponents(members: GuildMember[], page: number) {
    const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const pageMembers = members.slice(start, start + PAGE_SIZE);

    const select = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.select)
        .setPlaceholder(
            totalPages > 1
                ? `Выберите пользователя (стр. ${page + 1}/${totalPages})`
                : "Выберите пользователя"
        )
        .addOptions(
            pageMembers.map((m) => ({
                label: m.displayName.slice(0, 100),
                value: m.id,
                description: m.voice.serverMute ? "Сейчас заглушен" : "Сейчас не заглушен",
                emoji: m.voice.serverMute ? "🔇" : "🔊",
            }))
        );

    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ];

    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId(CUSTOM_IDS.prev)
            .setLabel("Назад")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId(CUSTOM_IDS.next)
            .setLabel("Вперёд")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1);

        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
    }

    return rows;
}

export default {
    customId: TEMP_VOICE_BUTTON_IDS.mute_unmute,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_mute_unmute" });

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

            const membersInChannel = [...voiceChannel.members.values()].sort((a, b) =>
                a.displayName.localeCompare(b.displayName)
            );

            if (membersInChannel.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> В вашем голосовом канале никого нет")],
                });
                return;
            }

            let page = 0;

            const reply = await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Выберите пользователя, чтобы заглушить или снять заглушение")],
                components: buildComponents(membersInChannel, page),
            });

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 5 * 60_000,
            });

            collector.on("collect", async (i) => {
                try {
                    if (i.customId === CUSTOM_IDS.prev || i.customId === CUSTOM_IDS.next) {
                        page = i.customId === CUSTOM_IDS.prev ? page - 1 : page + 1;

                        await i.update({
                            components: buildComponents(membersInChannel, page),
                        });
                        return;
                    }

                    if (i.customId === CUSTOM_IDS.select) {
                        const selectInteraction = i as StringSelectMenuInteraction;
                        const targetId = selectInteraction.values[0];
                        const targetMember = voiceChannel.members.get(targetId);

                        if (!targetMember || !targetMember.voice.channel) {
                            await selectInteraction.update({
                                embeds: [new EmbedBuilder().setDescription("> Этот пользователь уже покинул канал")],
                                components: buildComponents(membersInChannel, page),
                            });
                            return;
                        }

                        const newMuteState = !targetMember.voice.serverMute;

                        await targetMember.voice.setMute(
                            newMuteState,
                            `Muted/unmuted by ${member.user.tag} via temp voice controls`
                        );

                        const refreshedMembers = [...voiceChannel.members.values()].sort((a, b) =>
                            a.displayName.localeCompare(b.displayName)
                        );

                        log.button.info(
                            meta,
                            `${member.user.tag} ${newMuteState ? "muted" : "unmuted"} ${targetMember.user.tag}`
                        );

                        await selectInteraction.update({
                            embeds: [
                                new EmbedBuilder().setDescription(
                                    newMuteState
                                        ? `> 🔇 **${targetMember.displayName}** заглушен`
                                        : `> 🔊 **${targetMember.displayName}** больше не заглушен`
                                ),
                            ],
                            components: buildComponents(refreshedMembers, page),
                        });
                    }
                } catch (error) {
                    log.button.error(meta, `Error handling mute/unmute interaction: ${error}`);
                    if (!i.replied && !i.deferred) {
                        await i
                            .update({
                                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
                                components: buildComponents(membersInChannel, page),
                            })
                            .catch(() => { });
                    }
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => { });
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to toggle mute/unmute for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Button;