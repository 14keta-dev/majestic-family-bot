import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { EventSchema } from "../../../utils/EVENT/event.schema";


export const SUBMIT_REPLAY_BUTTON_BASE_URL = "embed:manage_event:submit_replay";

export const dm_request_replay_embed = ({ event }: { event: EventSchema }) => {
    const dm_embed = new EmbedBuilder()
        .setTitle("Откат")
        .setDescription(`> Вы участвовали в ${event.type}\n> Оставьте откат.`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Оставить откат")
            .setCustomId(`${SUBMIT_REPLAY_BUTTON_BASE_URL}:${event.id}`),
    );

    return { embeds: [dm_embed], components: [row] };
};