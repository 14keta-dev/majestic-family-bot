import { ActionRowBuilder, ButtonInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { CREATE_EVENT_EMBED_CUSTOM_IDS } from "../../embed/EVENT/create.embed";

export const CREATE_EVENT_MODAL_CUSTOM_IDS = {
    modal: "embed:create_event:create:modal",
    description: "embed:create_event:description:input",
    participants: "embed:create_event:participants:input",
    start_time: "embed:create_event:start_time:input"
}


export default {
    customId: CREATE_EVENT_EMBED_CUSTOM_IDS.create,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "create_mp" });

        try {
            log.button.info(meta, "Create mp button triggered");

            const mp = interaction.customId
                .replace(`${CREATE_EVENT_EMBED_CUSTOM_IDS.create}:`, "")
                .trim();

            const description_input = new TextInputBuilder()
                .setLabel("Описания")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(4000)
                .setCustomId(CREATE_EVENT_MODAL_CUSTOM_IDS.description)
                .setStyle(TextInputStyle.Paragraph);

            const max_participants = new TextInputBuilder()
                .setLabel("Огран участников")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3)
                .setStyle(TextInputStyle.Short)
                .setCustomId(CREATE_EVENT_MODAL_CUSTOM_IDS.participants);

            const start_time = new TextInputBuilder()
                .setLabel("Начало")
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setCustomId(CREATE_EVENT_MODAL_CUSTOM_IDS.start_time);

            const modal = new ModalBuilder()
                .setTitle(`Создать ${mp}`)
                .setCustomId(`${CREATE_EVENT_MODAL_CUSTOM_IDS.modal}:${mp}`)
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(description_input),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(max_participants),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(start_time),
                );

            await interaction.showModal(modal);
        } catch (error) {
            log.button.error(meta, "Failed to build create mp modal");
            await safeReply(interaction, error, "create_mp_button.execute", interaction.id);
        }
    },
} satisfies Button;