import { ButtonInteraction, Client } from "discord.js";
import { EventSchema } from "../event.schema";

export async function remind_thread_main_list({
    event,
    interaction
}: {
    event: EventSchema,
    interaction: ButtonInteraction
}) {

    if (event.mainListParticipant.length < 1) {
        return { message: "Основной список пуст" };
    }

    const thread = await interaction.guild?.channels.fetch(event.threadId);

    if (!thread || !thread.isTextBased()) {
        return { message: "Ветка не найдена" };
    }

    const timestamp = Math.floor(new Date(event.startTime).getTime() / 1000);

    const message = `**Напоминания об** ${event.type}\n**Начало**: <t:${timestamp}:R>\n${event.mainListParticipant.map((u) => `<@${u}>`).join(" ")}`

    await thread.send({
        content: message
    });

    return { message: "Основной список оповещён" };
}

export async function remind_thread_replacement_list({
    event,
    interaction
}: {
    event: EventSchema,
    interaction: ButtonInteraction
}) {

    if (event.replacementListParticinapnt.length < 1) {
        return { message: "Запасной список пуст" };
    }

    const thread = await interaction.guild?.channels.fetch(event.threadId);

    if (!thread || !thread.isTextBased()) {
        return { message: "Ветка не найдена" };
    }

    const timestamp = Math.floor(new Date(event.startTime).getTime() / 1000);
    const message = `**Напоминания об** ${event.type}\n**Начало**: <t:${timestamp}:R>\n${event.replacementListParticinapnt.map((u) => `<@${u}>`).join(" ")}`

    await thread.send({
        content: message
    });

    return { message: "Запасной список оповещён" };
}

export async function remind_thread_both({
    event,
    interaction
}: {
    event: EventSchema,
    interaction: ButtonInteraction
}) {

    if (event.mainListParticipant.length < 1 && event.replacementListParticinapnt.length < 1) {
        return { message: "Оба списка пусты" };
    }

    const thread = await interaction.guild?.channels.fetch(event.threadId);

    if (!thread || !thread.isTextBased()) {
        return { message: "Ветка не найдена" };
    }

    const timestamp = Math.floor(new Date(event.startTime).getTime() / 1000);
    const message = `**Напоминания об** ${event.type}\n
    **Начало**:<t:${timestamp}:R>\n\n
    **Основной список**\n\n
    ${event.mainListParticipant.map((u) => `<@${u}>`).join(" ")}\n\n
    **Запасной список**\n\n
    ${event.replacementListParticinapnt.map((u) => `<@${u}>`).join(" ")}`
    await thread.send({
        content: message
    });

    return { message: "Оба списка оповещены" };
}