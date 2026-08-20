import { GuildMember, MessageFlags, StringSelectMenuInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from "discord.js";
import { REMOVE_FROM_EVENT_REPLACEMENT_LIST_SELECT } from "../../../embed/EVENT/manage_event/remove_from_replacement.embed";
import { StringSelectMenu } from "../../../types";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { resolveManageableEvent } from "../../../utils/EVENT/resolveManageableEvent.helper";
import { event_store } from "../../../utils/EVENT/event.schema";
import { updateEventEmbed } from "../../../utils/EVENT/update_embed";

export default {
    customId: REMOVE_FROM_EVENT_REPLACEMENT_LIST_SELECT,
    dynamic: true,
    async execute(interaction: StringSelectMenuInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const eventId = interaction.customId
            .replace(`${REMOVE_FROM_EVENT_REPLACEMENT_LIST_SELECT}:`, "")
            .trim();

        if (!eventId) return;

        try {
            const ctx = await resolveManageableEvent({
                interaction,
                eventId,
                member: interaction.member as GuildMember,
                logNamespace: "select",
                logSource: "remove_from_replacement",
            });
            if (!ctx) return;

            const selectedIds = interaction.values;
            if (!selectedIds || selectedIds.length < 1) {
                await interaction.reply({ content: "Ничего не выбрано", flags: MessageFlags.Ephemeral });
                return;
            }

            const removed: string[] = [];
            const notInList: string[] = [];

            for (const userId of selectedIds) {
                const result = await event_store.remove_from_replacement(eventId, userId);
                switch (result.status) {
                    case "removed": removed.push(userId); break;
                    case "not_in_list": notInList.push(userId); break;
                    case "not_found":
                        log.select.error({}, `Event disappeared mid remove_from_replacement loop`, { eventId, userId });
                        break;
                }
            }

            const finalEvent = event_store.get(eventId);
            if (finalEvent) await updateEventEmbed(interaction.client, finalEvent);

            const lines: string[] = [];
            if (removed.length > 0) lines.push(`Удалено: ${removed.map((u) => `<@${u}>`).join(" ")}`);
            if (notInList.length > 0) lines.push(`Не были в списке: ${notInList.map((u) => `<@${u}>`).join(" ")}`);

            await interaction.update({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Удалить из запасного состава"))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.length > 0 ? lines.join("\n") : "Ничего не изменилось")),
                ],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            log.select.error({}, "Failed to process remove_from_replacement select interaction");
            await safeReply(interaction, error, "remove_from_replacement.select.execute", interaction.id);
        }
    }
} satisfies StringSelectMenu;