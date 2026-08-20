import { GuildMember, UserSelectMenuInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, EmbedBuilder } from "discord.js";
import { ADD_TO_EVENT_MAIN_LIST_SELECT } from "../../../embed/EVENT/manage_event/add_to_main.embed";
import { UserSelectMenu } from "../../../types";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { resolveManageableEvent } from "../../../utils/EVENT/resolveManageableEvent.helper";
import { event_store } from "../../../utils/EVENT/event.schema";
import { updateEventEmbed } from "../../../utils/EVENT/update_embed";

export default {
    customId: ADD_TO_EVENT_MAIN_LIST_SELECT,
    dynamic: true,
    async execute(interaction: UserSelectMenuInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const eventId = interaction.customId
            .replace(`${ADD_TO_EVENT_MAIN_LIST_SELECT}:`, "")
            .trim();

        if (!eventId) {
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            const ctx = await resolveManageableEvent({
                interaction,
                eventId,
                member: interaction.member as GuildMember,
                logNamespace: "select",
                logSource: "add_to_main",
            });
            if (!ctx) return;

            const selectedIds = interaction.values;
            if (!selectedIds || selectedIds.length < 1) {
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Ничего не выбрано")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const alreadyInMain: string[] = [];
            const added: string[] = [];
            const full: string[] = [];

            for (const userId of selectedIds) {
                const result = await event_store.add_to_main(eventId, userId);

                switch (result.status) {
                    case "added": added.push(userId); break;
                    case "already_in_list": alreadyInMain.push(userId); break;
                    case "full": full.push(userId); break;
                    case "not_found":
                        log.select.error({}, `Event disappeared mid add_to_main loop`, { eventId, userId });
                        break;
                }
            }

            const finalEvent = event_store.get(eventId);
            if (finalEvent) await updateEventEmbed(interaction.client, finalEvent);

            const lines: string[] = [];
            if (added.length > 0) lines.push(`Добавлено: ${added.map((u) => `<@${u}>`).join(" ")}`);
            if (alreadyInMain.length > 0) lines.push(`Уже в списке: ${alreadyInMain.map((u) => `<@${u}>`).join(" ")}`);
            if (full.length > 0) lines.push(`Список заполнен, не добавлены: ${full.map((u) => `<@${u}>`).join(" ")}`);

            await interaction.update({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Добавить в основной состав"))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.length > 0 ? lines.join("\n") : "Ничего не изменилось")),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.select.error({}, "Failed to process add_to_main select interaction");
            await safeReply(interaction, error, "add_to_main.select.execute", interaction.id);
        }
    }
} satisfies UserSelectMenu;