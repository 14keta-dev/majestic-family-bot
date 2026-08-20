import { EmbedBuilder, GuildMember, MessageFlags, UserSelectMenuInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from "discord.js";
import { ADD_TO_EVENT_REPLACEMENT_LIST_SELECT } from "../../../embed/EVENT/manage_event/add_to_replacement.embed";
import { UserSelectMenu } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { getConfig } from "../../../utils/config/store";
import { event_store } from "../../../utils/EVENT/event.schema";
import { can_manage_event } from "../../../utils/EVENT/can_manage.helper";
import { updateEventEmbed } from "../../../utils/EVENT/update_embed";
import { safeReply } from "../../../utils/safeReply.helper";


export default {
    customId: ADD_TO_EVENT_REPLACEMENT_LIST_SELECT,
    dynamic: true,
    async execute(interaction: UserSelectMenuInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { select: "add_to_replacement" });

        const eventId = interaction.customId
            .replace(`${ADD_TO_EVENT_REPLACEMENT_LIST_SELECT}:`, "")
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

            const selectedIds = interaction.values;

            if (!selectedIds || selectedIds.length < 1) {
                log.select.debug(meta, `Moderator didn't select any users when adding to replacement list`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Ничего не выбрано")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const inMainList: string[] = [];
            const alreadyInReplacement: string[] = [];
            const added: string[] = [];

            for (const userId of selectedIds) {
                const result = await event_store.add_to_replacement(eventId, userId);

                switch (result.status) {
                    case "added": {
                        added.push(userId);
                        break;
                    }
                    case "already_in_list": {
                        alreadyInReplacement.push(userId);
                        break;
                    }
                    case "in_main_list": {
                        inMainList.push(userId);
                        break;
                    }
                    case "not_found": {
                        log.select.error(meta, `Event disappeared mid add_to_replacement loop`, { eventId, userId });
                        break;
                    }
                }
            }

            const finalEvent = event_store.get(eventId);

            if (finalEvent) {
                await updateEventEmbed(interaction.client, finalEvent);
            }

            const lines: string[] = [];

            if (added.length > 0) {
                lines.push(`Добавлено: ${added.map((u) => `<@${u}>`).join(" ")}`);
            }
            if (alreadyInReplacement.length > 0) {
                lines.push(`Уже в списке: ${alreadyInReplacement.map((u) => `<@${u}>`).join(" ")}`);
            }
            if (inMainList.length > 0) {
                lines.push(`Уже в основном списке, не добавлены: ${inMainList.map((u) => `<@${u}>`).join(" ")}`);
            }

            const summary = lines.length > 0 ? lines.join("\n") : "Ничего не изменилось";

            await interaction.update({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## Добавить в запасной состав"),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(summary),
                        ),
                ],
                flags: MessageFlags.IsComponentsV2
            });

            log.select.debug(meta, `Processed add_to_replacement selection`, { eventId, added, alreadyInReplacement, inMainList });

        } catch (error) {
            log.select.error(meta, "Failed to process add_to_replacement select interaction");
            await safeReply(interaction, error, "add_to_replacement.select.execute", interaction.id);
        }
    }
} satisfies UserSelectMenu;