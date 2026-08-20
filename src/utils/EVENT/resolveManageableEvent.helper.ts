import { EmbedBuilder, GuildMember, InteractionReplyOptions, MessageFlags, RepliableInteraction } from "discord.js";
import { getConfig } from "../config/store";
import { can_manage_event } from "./can_manage.helper";
import { log } from "../logger";
import { metaBuilder } from "../logger/met_builder";
import { event_store, EventSchema } from "./event.schema";

type EventConfigEntry = ReturnType<typeof getConfig>["event"][number];

export interface ManageableEventContext {
    event: EventSchema;
    eventConfig: EventConfigEntry;
}

type LogNamespace = "button" | "select" | "modal";

async function replyError(interaction: RepliableInteraction, description: string): Promise<void> {
    const payload: InteractionReplyOptions = {
        embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription(description)],
        flags: MessageFlags.Ephemeral,
    };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch {
        // Interaction token likely expired — nothing more we can do here,
        // and the caller already logged the underlying reason.
    }
}

export async function resolveManageableEvent({
    interaction,
    eventId,
    member,
    logNamespace,
    logSource,
}: {
    interaction: RepliableInteraction;
    eventId: string;
    member: GuildMember;
    logNamespace: LogNamespace;
    logSource: string;
}): Promise<ManageableEventContext | null> {
    const meta = metaBuilder(member, { [logNamespace]: logSource });
    const logger = log[logNamespace];

    const event = event_store.get(eventId);
    if (!event) {
        logger.error(meta, `Could not find event stored in json db`, { eventId });
        await replyError(interaction, "> Мп закончилось");
        return null;
    }

    const eventConfig = getConfig().event.find((e) => e.name === event.type);
    if (!eventConfig) {
        logger.error(meta, `Could not find event type in config store`, { type: event.type });
        await replyError(interaction, "> Этот вид МП удален");
        return null;
    }

    const isEligible = await can_manage_event({ type: event.type, user: member, event });
    if (!isEligible) {
        logger.debug(meta, `User is not eligible to manage event`, { eventId });
        await replyError(interaction, "> У вас нет прав управлять сбором");
        return null;
    }

    return { event, eventConfig };
}