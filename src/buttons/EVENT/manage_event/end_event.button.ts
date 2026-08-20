import { ButtonInteraction, ContainerBuilder, GuildMember, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextChannel, TextDisplayBuilder } from "discord.js";
import { END_EVENT_EMBED_BASE_URL, END_EVENT_EMBED_BUTTONS } from "../../../embed/EVENT/manage_event/end_event.embed";
import { resolveManageableEvent } from "../../../utils/EVENT/resolveManageableEvent.helper";
import { log } from "../../../utils/logger";
import { manage_event_embed } from "../../../embed/EVENT/manage_event/manage_event.embed";
import { archived_event_embed } from "../../../embed/EVENT/manage_event/archive_event.embed";
import { event_store } from "../../../utils/EVENT/event.schema";
import { dm_request_replay_embed } from "../../../embed/EVENT/manage_event/dm_replay_request.embed";
import { dmFanout } from "../../../utils/EVENT/manage_event/dm_fanout.helper";
import { safeReply } from "../../../utils/safeReply.helper";
import { Button } from "../../../types";


function statusContainer(title: string, description: string) {
    return [
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description)),
    ];
}

const endingInProgress = new Set<string>();

export default {
    customId: END_EVENT_EMBED_BASE_URL,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;
        const rest = interaction.customId
            .replace(`${END_EVENT_EMBED_BASE_URL}:`, "")
            .trim();

        const [action, eventId] = rest.split(":");

        if (!action || !eventId) {
            log.button.error({}, `Could not parse action/event id from customid: ${interaction.customId}`);
            return;
        }

        try {
            const ctx = await resolveManageableEvent({
                interaction,
                eventId,
                member: interaction.member as GuildMember,
                logNamespace: "button",
                logSource: "end_event",
            });
            if (!ctx) return;

            const { event, eventConfig } = ctx;

            switch (action) {
                case END_EVENT_EMBED_BUTTONS.cancel: {
                    await interaction.update({
                        components: manage_event_embed({ id: eventId, open: event.registrationOpen }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case END_EVENT_EMBED_BUTTONS.end: {
                    if (endingInProgress.has(eventId)) {
                        log.button.debug({}, `Ignored duplicate end click, already in progress`, { eventId });
                        await interaction.reply({
                            content: "Завершение МП уже выполняется",
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }
                    endingInProgress.add(eventId);

                    try {
                        await interaction.update({
                            components: statusContainer("Завершение МП...", "> Идет архивация и рассылка, подождите"),
                            flags: MessageFlags.IsComponentsV2
                        });

                        const archiveChannel = await interaction.guild.channels.fetch(eventConfig.replay_channel) as TextChannel | null;

                        if (!archiveChannel) {
                            log.button.error({}, `Archive channel not found`, { eventId, archiveChannelId: eventConfig.replay_channel });
                            await interaction.editReply({
                                components: statusContainer("Ошибка", "> Канал архива не найден"),
                                flags: MessageFlags.IsComponentsV2
                            }).catch(() => undefined);
                            return;
                        }

                        const archiveMessage = await archiveChannel.send({
                            components: archived_event_embed({ event }),
                            flags: MessageFlags.IsComponentsV2
                        });

                        const archiveThread = await archiveMessage.startThread({
                            name: `${event.type} — откаты`,
                            autoArchiveDuration: 10080, // 7 days
                        });

                        await event_store.updateLocked(eventId, {
                            registrationOpen: false,
                            endedAt: new Date().toISOString(),
                            archiveMessage: archiveMessage.id,
                            archiveThreadId: archiveThread.id,
                        });

                        try {
                            if (interaction.channel?.isTextBased() && event.messageId) {
                                const tagMessage = await interaction.channel.messages.fetch(event.messageId);
                                await tagMessage.delete();
                            }
                        } catch {
                            log.button.warn({}, `Failed to delete tag message`, { eventId, messageId: event.messageId });
                        }

                        const dmPayload = dm_request_replay_embed({ event });
                        const { failed: dmFailed } = await dmFanout({
                            client: interaction.client,
                            userIds: event.mainListParticipant ?? [],
                            payload: dmPayload,
                        });

                        if (dmFailed.length > 0) {
                            log.button.warn({}, `Failed to DM some main list participants`, { eventId, dmFailed });
                        }

                        await interaction.editReply({
                            components: statusContainer("МП завершено", "> Сбор был успешно завершен и заархивирован"),
                            flags: MessageFlags.IsComponentsV2
                        });
                    } catch (archiveError) {
                        log.button.error({}, `Failed to archive/end event`, { eventId });
                        await interaction.editReply({
                            components: statusContainer("Ошибка", "> Не удалось завершить сбор, попробуйте еще раз"),
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => undefined);
                    } finally {
                        endingInProgress.delete(eventId);
                    }
                    break;
                }
                default: {
                    log.button.warn({}, `Selected end_event action has no handler implemented yet`, { eventId, action });
                }
            }
        } catch (error) {
            log.button.error({}, "Failed to process end_event button interaction");
            await safeReply(interaction, error, "end_event.button.execute", interaction.id);
        }
    }
} satisfies Button;