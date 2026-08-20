import { Client, MessageFlags, ThreadChannel } from "discord.js";
import { log } from "../logger";
import { event_tag_embed } from "../../embed/EVENT/tag.embed";
import { getConfig } from "../config/store";
import { EventSchema } from "./event.schema";

export async function updateEventEmbed(client: Client, event: EventSchema): Promise<void> {
    const channel = await client.channels.fetch(event.threadId).catch(() => null);
    if (!channel || !(channel instanceof ThreadChannel)) {
        log.event.warn("Could not fetch event thread for embed update", { eventId: event.id, threadId: event.threadId, type: event.type });
        return;
    }

    const starterMessage = await channel.fetchStarterMessage().catch(() => null);
    if (!starterMessage) {
        log.event.warn("Could not fetch starter message", { eventId: event.id, threadId: event.threadId });
        return;
    }

    const mp_config = getConfig().event.find((m) => m.name === event.type);
    if (!mp_config) {
        log.event.warn("No MP config found for event type; falling back to raw type", {
            eventId: event.id, type: event.type,
        });
    }

    const unixSeconds = String(Math.floor(new Date(event.startTime).getTime() / 1000));

    const container = event_tag_embed({
        id: event.id,
        name: mp_config?.name ?? event.type,
        registrationOpen: event.registrationOpen,
        description: event.description,
        mainList: event.mainListParticipant,
        replacementList: event.replacementListParticinapnt ?? [],
        startTime: unixSeconds,
        maxParticipants: event.maxParticipants,
    });

    try {
        await starterMessage.edit({
            components: container,
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (error) {
        log.event.warn("Failed to edit starter message with updated embed", { eventId: event.id, threadId: event.threadId, error });
        return;
    }

    log.event.debug("MP event embed updated", { eventId: event.id, type: event.type });
}
