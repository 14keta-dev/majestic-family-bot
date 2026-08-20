import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../../types";
import { getConfig } from "../../../utils/config/store";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { MANAGE_TAG_EMBED_CUSTOM_IDS } from "../../../embed/EVENT/tag.embed";
import { event_store } from "../../../utils/EVENT/event.schema";
import { can_manage_event } from "../../../utils/EVENT/can_manage.helper";
import { manage_event_embed } from "../../../embed/EVENT/manage_event/manage_event.embed";

export default {
    customId: MANAGE_TAG_EMBED_CUSTOM_IDS.manage,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "manage_event:button" });

        const eventId = interaction.customId
            .replace(`${MANAGE_TAG_EMBED_CUSTOM_IDS.manage}:`, "")
            .trim();

        if (!eventId) {
            log.button.error(meta, `Could not parse event id from customid: ${interaction.customId}`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral
            });
            return;
        };

        try {

            const event = event_store.get(eventId);

            if (!event) {
                log.button.error(meta, `Could not find event stored in json db`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Мп закончилось")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const config = getConfig().event;

            const eventConfig = config.find((e) => e.name === event.type);

            if (!eventConfig) {
                log.button.error(meta, `Could not find event type in config store`, { type: event.type });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Этот вид МП удален")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            const isEligible = await can_manage_event({ type: event.type, user: interaction.member as GuildMember, event: event });

            if (!isEligible) {
                log.button.debug(meta, `User is not eligible to manage event`, { eventId });
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> У вас нет прав управлять сбором")],
                    flags: MessageFlags.Ephemeral
                });
                return;
            };

            await interaction.reply({
                components: manage_event_embed({ id: eventId, open: event.registrationOpen }),
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            })
        } catch (error) {
            log.button.error(meta, "Failed to build/send event manage panel");
            await safeReply(interaction, error, "manage_event.execute", interaction.id);
        }
    }
} satisfies Button;