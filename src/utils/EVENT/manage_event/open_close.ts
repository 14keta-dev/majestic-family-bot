import { Client, ThreadChannel } from "discord.js";
import { log } from "../../logger";
import { event_store, EventSchema } from "../event.schema";
import { updateEventEmbed } from "../update_embed";

export async function open_close_event({
    event,
    client,
}: {
    event: EventSchema,
    client: Client
}) {

    const current = event.registrationOpen;
    const next = !current;

    const updated = await event_store.updateLocked(event.id, {
        registrationOpen: next,
    });

    if (!updated) {
        log.event.warn("Failed to toggle registration, event not found", { eventId: event.id });
        return {
            event,
            message: "Не удалось изменить статус регистрации",
        };
    }

    const thread = await client.channels.fetch(event.threadId).catch(() => null);

    if (thread instanceof ThreadChannel) {
        try {
            await thread.setLocked(!next, next ? "Регистрация открыта" : "Регистрация закрыта");
        } catch (error) {
            log.event.warn("Failed to lock/unlock thread", { eventId: event.id, threadId: event.threadId, error });
        }
    } else {
        log.event.warn("Could not fetch thread to lock/unlock", { eventId: event.id, threadId: event.threadId });
    }

    await updateEventEmbed(client, updated);

    log.event.debug("Registration state toggled", { eventId: event.id, type: event.type, open: next });

    return {
        event: updated,
        message: next ? "Регистрация открыта" : "Регистрация закрыта",
    };
}