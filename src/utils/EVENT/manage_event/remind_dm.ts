import { Client, EmbedBuilder } from "discord.js";
import { dmFanout } from "./dm_fanout.helper";
import { EventSchema } from "../event.schema";

function buildReminderEmbed(event: EventSchema, listLabel: string): EmbedBuilder {
    const timestamp = Math.floor(new Date(event.startTime).getTime() / 1000);
    return new EmbedBuilder()
        .setTitle(`Напоминания об ${event.type}`)
        .setDescription(`> **Начало**: <t:${timestamp}:R>\n> Вы в ${listLabel}`);
}

export async function remind_dm_main_list({
    event,
    client,
}: {
    event: EventSchema;
    client: Client;
}) {
    if (event.mainListParticipant.length < 1) {
        return { message: "Основной список пуст" };
    }

    const embed = buildReminderEmbed(event, "основном списке");
    const { sent, failed } = await dmFanout({
        client,
        userIds: event.mainListParticipant,
        payload: { embeds: [embed] },
    });

    return { message: `Основной список оповещён (${sent.length} успешно, ${failed.length} не удалось)` };
}

export async function remind_dm_replacement_list({
    event,
    client,
}: {
    event: EventSchema;
    client: Client;
}) {
    if (event.replacementListParticinapnt.length < 1) {
        return { message: "Запасной список пуст" };
    }

    const embed = buildReminderEmbed(event, "запасном списке");
    const { sent, failed } = await dmFanout({
        client,
        userIds: event.replacementListParticinapnt,
        payload: { embeds: [embed] },
    });

    return { message: `Запасной список оповещён (${sent.length} успешно, ${failed.length} не удалось)` };
}

export async function remind_dm_both({
    event,
    client,
}: {
    event: EventSchema;
    client: Client;
}) {
    if (event.mainListParticipant.length < 1 && event.replacementListParticinapnt.length < 1) {
        return { message: "Оба списка пусты" };
    }

    const mainEmbed = buildReminderEmbed(event, "основном списке");
    const replacementEmbed = buildReminderEmbed(event, "запасном списке");

    const [mainResult, replacementResult] = await Promise.all([
        dmFanout({ client, userIds: event.mainListParticipant, payload: { embeds: [mainEmbed] } }),
        dmFanout({ client, userIds: event.replacementListParticinapnt, payload: { embeds: [replacementEmbed] } }),
    ]);

    const sent = mainResult.sent.length + replacementResult.sent.length;
    const failed = mainResult.failed.length + replacementResult.failed.length;

    return { message: `Оба списка оповещены (${sent} успешно, ${failed} не удалось)` };
}