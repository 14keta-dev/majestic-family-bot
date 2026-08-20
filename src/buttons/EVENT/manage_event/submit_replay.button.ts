import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { env } from "../../../utils/env";
import { SUBMIT_REPLAY_BUTTON_BASE_URL } from "../../../embed/EVENT/manage_event/dm_replay_request.embed";
import { event_store } from "../../../utils/EVENT/event.schema";

export const SUBMIT_EVENT_REPLY_MODAL = {
    modal: "embed:submit_replay:modal",
    link: "embed:submit_replay:link:input",
};

export default {
    customId: SUBMIT_REPLAY_BUTTON_BASE_URL,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        // This handler only runs in DMs
        if (interaction.guildId) return;

        const meta = metaBuilder(interaction.user, env.GUILD_ID ?? "unknown", { button: "submit_replay" });

        const eventId = interaction.customId
            .replace(`${SUBMIT_REPLAY_BUTTON_BASE_URL}:`, "")
            .trim();

        if (!eventId) {
            log.button.warn(meta, `Could not parse event id from customId "${interaction.customId}"`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const event = event_store.get(eventId);

        if (!event) {
            log.button.warn(meta, `Event ${eventId} not found when trying to open replay modal`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Событие не найдено")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            const have_submitted = event.replaysSubmitted.find((u) => u.user === interaction.user.id);

            if (have_submitted) {
                log.button.debug(meta, `User already submitted replay for event ${eventId}`);

                if (interaction.message.editable) {
                    await interaction.message.edit({ components: [] }).catch((error) => {
                        log.button.warn(meta, `Failed to clear components on already-submitted message: ${error}`);
                    });
                }

                await interaction.reply({
                    embeds: [new EmbedBuilder().setDescription("> Вы уже залили откат")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const link_input = new TextInputBuilder()
                .setLabel("Ссылка")
                .setCustomId(`${SUBMIT_EVENT_REPLY_MODAL.link}:${eventId}`)
                .setRequired(true)
                .setPlaceholder("https://you..")
                .setStyle(TextInputStyle.Short)
                .setMinLength(12);

            const modal = new ModalBuilder()
                .setTitle(`Откат ${event.type ?? "MP"}`)
                .setCustomId(`${SUBMIT_EVENT_REPLY_MODAL.modal}:${eventId}`)
                .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(link_input));

            await interaction.showModal(modal);
        } catch (error) {
            log.button.error(meta, `Error while opening replay modal for event ${eventId}: ${error}`);

            if (!interaction.replied && !interaction.deferred) {
                await interaction
                    .reply({
                        embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Не удалось открыть форму, попробуйте снова")],
                        flags: MessageFlags.Ephemeral,
                    })
                    .catch(() => undefined);
            }
        }
    },
} satisfies Button;