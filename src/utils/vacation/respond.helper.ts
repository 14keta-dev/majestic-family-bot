import { EmbedBuilder, InteractionEditReplyOptions, InteractionReplyOptions, RepliableInteraction } from "discord.js";

export async function respond(interaction: RepliableInteraction, payload: InteractionEditReplyOptions) {
    const resolved = toEmbedPayload(payload);

    if (interaction.deferred || interaction.replied) {
        return interaction.editReply(resolved);
    }
    return interaction.reply(resolved as InteractionReplyOptions);
}


function toEmbedPayload(payload: InteractionEditReplyOptions): InteractionEditReplyOptions {
    if (payload.embeds && payload.embeds.length > 0) {
        return payload;
    }

    if (typeof payload.content === "string") {
        const embed = new EmbedBuilder().setDescription(`> ${payload.content}`);
        return { ...payload, content: undefined, embeds: [embed] };
    }

    return payload;
}