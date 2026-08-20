import { EmbedBuilder, GuildMember, MessageFlags, StringSelectMenuInteraction } from "discord.js";
import { MANAGE_EVENT_ACTIONS, MANAGE_EVENT_CUSTOM_IDS, manage_event_embed } from "../../../embed/EVENT/manage_event/manage_event.embed";
import { StringSelectMenu } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { getConfig } from "../../../utils/config/store";
import { safeReply } from "../../../utils/safeReply.helper";
import { remind_thread_embed } from "../../../embed/EVENT/manage_event/remind_in_thread";
import { remind_dm_embed } from '../../../embed/EVENT/manage_event/remind_dm.embed'
import { add_to_event_main_list } from "../../../embed/EVENT/manage_event/add_to_main.embed";
import { add_to_event_replacement_list } from "../../../embed/EVENT/manage_event/add_to_replacement.embed";
import { remove_from_event_main_list } from "../../../embed/EVENT/manage_event/remove_from_main.embed";
import { remove_from_event_replacement_list } from "../../../embed/EVENT/manage_event/remove_from_replacement.embed";
import { end_event_embed } from "../../../embed/EVENT/manage_event/end_event.embed";
import { event_store } from "../../../utils/EVENT/event.schema";
import { can_manage_event } from "../../../utils/EVENT/can_manage.helper";
import { edit_event_modal } from "../../../utils/EVENT/manage_event/edit";
import { open_close_event } from "../../../utils/EVENT/manage_event/open_close";


export default {
    customId: MANAGE_EVENT_CUSTOM_IDS.select,
    dynamic: true,
    async execute(interaction: StringSelectMenuInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { select: "manage_event" });

        const eventId = interaction.customId
            .replace(`${MANAGE_EVENT_CUSTOM_IDS.select}:`, "")
            .trim();

        if (!eventId) {
            log.select.error(meta, `Could not parse event id from customid: ${interaction.customId}`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral
            });
            return;
        };

        try {

            const event = event_store.get(eventId);

            if (!event) {
                log.select.error(meta, `Could not find event stored in json db`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Мп закончилось")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const config = getConfig().event;

            const eventConfig = config.find((e) => e.name === event.type);

            if (!eventConfig) {
                log.select.error(meta, `Could not find event type in config store`, { type: event.type });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Этот вид МП удален")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const isEligible = await can_manage_event({ type: event.type, user: interaction.member as GuildMember, event: event });

            if (!isEligible) {
                log.select.debug(meta, `User is not eligible to manage event`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> У вас нет прав управлять сбором")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const selected = interaction.values[0];

            if (!selected) {
                log.select.debug(meta, `Moderator didn't select any value when managing event`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Ничего не выбрано")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            switch (selected) {
                case MANAGE_EVENT_ACTIONS.edit: {
                    const modal = edit_event_modal({ id: eventId, event: event });
                    await interaction.showModal(modal);
                    break;
                }
                case MANAGE_EVENT_ACTIONS.remind_thread: {
                    await interaction.update({
                        components: remind_thread_embed({ event: event }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.remind_dm: {
                    await interaction.update({
                        components: remind_dm_embed({ event: event }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.open:
                case MANAGE_EVENT_ACTIONS.close: {
                    const { event: updatedEvent } = await open_close_event({ event, client: interaction.client });

                    await interaction.update({
                        components: manage_event_embed({ id: eventId, open: updatedEvent.registrationOpen }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.add_to_main: {
                    if (event.mainListParticipant.length >= event.maxParticipants) {
                        await interaction.reply({
                            embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription(`> Основной список заполнен ${event.mainListParticipant.length}/${event.maxParticipants}`)],
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    };

                    await interaction.update({
                        components: add_to_event_main_list({ event: event }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.add_to_replacement: {
                    await interaction.update({
                        components: add_to_event_replacement_list({ event: event }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.remove_from_main: {
                    await interaction.deferUpdate();

                    const components = await remove_from_event_main_list({ event: event, guild: interaction.guild });

                    await interaction.editReply({
                        components,
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.remove_from_replacement: {
                    await interaction.deferUpdate();

                    const components = await remove_from_event_replacement_list({ event: event, guild: interaction.guild });

                    await interaction.editReply({
                        components,
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                case MANAGE_EVENT_ACTIONS.end: {
                    await interaction.update({
                        components: end_event_embed({ event: event, archive_channel: eventConfig.replay_channel }),
                        flags: MessageFlags.IsComponentsV2
                    });
                    break;
                }
                default: {
                    log.select.warn(meta, `Selected action has no handler implemented yet`, { eventId, selected });
                    await interaction.reply({
                        embeds: [new EmbedBuilder().setTitle("Скоро").setDescription("> Это действие пока не реализовано")],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            log.select.error(meta, "Failed to process manage_event select interaction");
            await safeReply(interaction, error, "manage_event.select.execute", interaction.id);
        }
    }
} satisfies StringSelectMenu;