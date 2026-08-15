import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from "discord.js";
import { TEMP_VOICE_BUTTON_IDS } from "../../commands/prefix/temp.prefix";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { temp_voice_guard } from "../../utils/temp_voice/guard.helper";
import { log } from "../../utils/logger";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

const PAGE_SIZE = 25;

const CUSTOM_IDS = {
    select: "temp_voice_exclude_select",
    prev: "temp_voice_exclude_page_prev",
    next: "temp_voice_exclude_page_next",
};

function isExcluded(voiceChannel: GuildMember["voice"]["channel"], userId: string) {
    if (!voiceChannel) return false;
    const overwrite = voiceChannel.permissionOverwrites.cache.get(userId);
    return overwrite?.deny.has(PermissionsBitField.Flags.Connect) ?? false;
}

function buildComponents(
    voiceChannel: NonNullable<GuildMember["voice"]["channel"]>,
    members: GuildMember[],
    page: number
) {
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
            pageMembers.map((m) => {
                const excluded = isExcluded(voiceChannel, m.id);
                return {
                    label: m.displayName.slice(0, 100),
                    value: m.id,
                    description: excluded ? "Сейчас исключен" : "Сейчас не исключен",
                    emoji: excluded ? botAssetsEmojis.closed : botAssetsEmojis.active,
                };
            })
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
    customId: TEMP_VOICE_BUTTON_IDS.exclude_user,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;

        const meta = metaBuilder(member, { button: "temp_voice_exclude_user" });

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
                .filter((m) => m.id !== member.id)
                .sort((a, b) => a.displayName.localeCompare(b.displayName));

            if (membersInChannel.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription("> В вашем голосовом канале больше никого нет")],
                });
                return;
            }

            let page = 0;

            const reply = await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Выберите пользователя, чтобы исключить или вернуть доступ")],
                components: buildComponents(voiceChannel, membersInChannel, page),
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
                            components: buildComponents(voiceChannel, membersInChannel, page),
                        });
                        return;
                    }

                    if (i.customId === CUSTOM_IDS.select) {
                        const selectInteraction = i as StringSelectMenuInteraction;
                        const targetId = selectInteraction.values[0];
                        const targetMember = voiceChannel.guild.members.cache.get(targetId);

                        if (!targetMember) {
                            await selectInteraction.update({
                                embeds: [new EmbedBuilder().setDescription("> Не удалось найти этого пользователя")],
                                components: buildComponents(voiceChannel, membersInChannel, page),
                            });
                            return;
                        }

                        const currentlyExcluded = isExcluded(voiceChannel, targetMember.id);

                        if (currentlyExcluded) {
                            await voiceChannel.permissionOverwrites.edit(targetMember, { Connect: null });

                            log.button.info(meta, `${member.user.tag} included back ${targetMember.user.tag}`);

                            await selectInteraction.update({
                                embeds: [
                                    new EmbedBuilder().setDescription(
                                        `> ${botAssetsEmojis.active} **${targetMember.displayName}** больше не исключен`
                                    ),
                                ],
                                components: buildComponents(voiceChannel, membersInChannel, page),
                            });
                        } else {
                            await voiceChannel.permissionOverwrites.edit(targetMember, { Connect: false });

                            if (targetMember.voice.channelId === voiceChannel.id) {
                                await targetMember.voice.disconnect(
                                    `Excluded by ${member.user.tag} via temp voice controls`
                                );
                            }

                            log.button.info(meta, `${member.user.tag} excluded ${targetMember.user.tag}`);

                            await selectInteraction.update({
                                embeds: [
                                    new EmbedBuilder().setDescription(
                                        `> ${botAssetsEmojis.closed} **${targetMember.displayName}** исключен из канала`
                                    ),
                                ],
                                components: buildComponents(voiceChannel, membersInChannel, page),
                            });
                        }
                    }
                } catch (error) {
                    log.button.error(meta, `Error handling exclude interaction: ${error}`);
                    if (!i.replied && !i.deferred) {
                        await i
                            .update({
                                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
                                components: buildComponents(voiceChannel, membersInChannel, page),
                            })
                            .catch(() => { });
                    }
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => { });
            });
        } catch (error) {
            log.button.fatal(meta, `Unhadled erro while trying to toggle exclude for temp voice: ${error}`);
            console.error(error);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Произошла ошибка попробуйте через пару секунд")],
            }).catch(() => { });
        }
    },
} satisfies Button;