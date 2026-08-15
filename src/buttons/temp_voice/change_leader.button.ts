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
import { temp_voice_store } from "../../utils/temp_voice/schema";
import { botTempVoiceEmojis } from "../../utils/emojis/emojis";

const PAGE_SIZE = 25;

const CUSTOM_IDS = {
    select: "temp_voice_leader_select",
    prev: "temp_voice_leader_page_prev",
    next: "temp_voice_leader_page_next",
};

function buildComponents(members: GuildMember[], page: number) {
    const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const pageMembers = members.slice(start, start + PAGE_SIZE);

    const select = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.select)
        .setPlaceholder(
            totalPages > 1
                ? `Выберите нового лидера (стр. ${page + 1}/${totalPages})`
                : "Выберите нового лидера"
        )
        .addOptions(
            pageMembers.map((m) => ({
                label: m.displayName.slice(0, 100),
                value: m.id,
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
    customId: TEMP_VOICE_BUTTON_IDS.change_leader,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_change_leader" });

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

            const membersInChannel = [...voiceChannel.members.values()]
                .filter((m) => m.id !== member.id && !m.user.bot)
                .sort((a, b) => a.displayName.localeCompare(b.displayName));

            if (membersInChannel.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> В канале больше никого нет, чтобы передать лидерство")],
                });
                return;
            }

            let page = 0;

            const reply = await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Выберите пользователя, которому хотите передать лидерство")],
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

                        if (!targetMember) {
                            await selectInteraction.update({
                                embeds: [new EmbedBuilder().setDescription("> Этот пользователь уже покинул канал")],
                                components: buildComponents(membersInChannel, page),
                            });
                            return;
                        }

                        const updated = await temp_voice_store.update_owner({
                            id: voiceChannel.id,
                            newOwnerId: targetMember.id,
                        });

                        if (!updated) {
                            log.button.error(meta, `Failed to update owner in db for channel ${voiceChannel.id}`);
                            await selectInteraction.update({
                                embeds: [new EmbedBuilder().setDescription("> Не удалось найти канал в базе данных")],
                                components: buildComponents(membersInChannel, page),
                            });
                            return;
                        }

                        log.button.info(
                            meta,
                            `${member.user.tag} transferred leadership of channel ${voiceChannel.id} to ${targetMember.user.tag}`
                        );

                        collector.stop("leader_changed");

                        await selectInteraction.update({
                            embeds: [
                                new EmbedBuilder().setDescription(
                                    `> ${botTempVoiceEmojis.change_leader} **${targetMember.displayName}** теперь лидер канала`
                                ),
                            ],
                            components: [],
                        });
                    }
                } catch (error) {
                    log.button.error(meta, `Error handling leader change interaction: ${error}`);
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

            collector.on("end", async (_collected, reason) => {
                if (reason === "leader_changed") return;
                await interaction.editReply({ components: [] }).catch(() => { });
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to change leader for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Button;