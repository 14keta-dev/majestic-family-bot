import { Channel, ContainerBuilder, GuildMember, Message, MessageFlags, MessageReaction, PartialMessageReaction, PartialUser, TextDisplayBuilder, ThreadChannel, User } from "discord.js";
import { can_manage_event } from "./can_manage.helper";
import { log } from "../logger";
import { event_store, EventSchema } from "./event.schema";
import { updateEventEmbed } from "./update_embed";

export const MAIN_LIST_EMOJI = "✅";
export const REPLACEMENT_LIST_EMOJI = "⏰"

interface TrackedThread {
    mp: EventSchema,
    event: EventSchema
};

interface ResolvedReaction {
    targetId: string;
    message: Message;
    reactorId: string;
}

export function getTrackedMpThread(channel: Channel | null | undefined): TrackedThread | null {
    if (!channel || !(channel instanceof ThreadChannel)) return null;

    const event = event_store.get_by_thread(channel.id);
    if (!event) return null;

    return { mp: event, event }
};

async function resolveReaction(
    reaction: MessageReaction | PartialMessageReaction,
    reactor: User | PartialUser,
    event: EventSchema,
): Promise<ResolvedReaction | null> {
    if (reactor.bot) return null;

    const message = reaction.message.partial
        ? await reaction.message.fetch().catch(() => null)
        : reaction.message as Message;

    if (!message || !message.guild) return null;

    const member = await message.guild.members.fetch(reactor.id).catch(() => null) as GuildMember | null;
    if (!member) return null;

    if (!(await can_manage_event({ type: event.type, user: member, event }))) {
        log.event.debug("Reaction ignored - reactor is not moderator", {
            eventId: event.id, reactorId: reactor.id
        })
        return null;
    }

    const author = message.author;
    if (!author || author.bot) return null;

    return { targetId: author.id, message, reactorId: reactor.id };
}

async function sendFullWarning(message: Message, text: string): Promise<void> {
    if (message.channel.isDMBased()) return;
    const warning = await message.channel.send({
        components: [
            new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`⚠️ ${text}`),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);

    if (warning) {
        setTimeout(() => warning.delete().catch(() => { }), 2000);
    }
}


export async function handle_mp_reaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    event: EventSchema
): Promise<void> {
    const emoji = reaction.emoji.name;
    if (emoji != MAIN_LIST_EMOJI && emoji != REPLACEMENT_LIST_EMOJI) return;

    const resolved = await resolveReaction(reaction, user, event);
    if (!resolved) return;

    const { targetId, message, reactorId } = resolved;

    if (emoji === MAIN_LIST_EMOJI) {
        const result = await event_store.add_to_main(event.id, targetId);

        if (result.status === "not_found" || result.status === "already_in_list") {
            return;
        }

        if (result.status === "full") {
            await reaction.users.remove(reactorId).catch(() => { });
            await sendFullWarning(
                message,
                `Основной список уже заполнен (${result.event.maxParticipants}/${result.event.maxParticipants}). Освободите место перед добавлением.`,
            );
            log.event.debug("Main list full - reaction removed", {
                eventId: event.id, targetId, reactorId
            })
            return;
        }

        const wasInReplacement = (event.replacementListParticinapnt ?? []).includes(targetId);
        if (wasInReplacement) {
            await message.reactions
                .resolve(REPLACEMENT_LIST_EMOJI)
                ?.users.remove(reactorId)
                .catch(() => { });
        }

        log.event.debug("User added to main list via reaction", { eventId: event.id, targetId, reactorId, type: event.type })

        await updateEventEmbed(reaction.client, result.event).catch((err) => {
            log.event.warn("Failed to update embed after main list reaction", { err });
        })
        return;
    }

    if (emoji === REPLACEMENT_LIST_EMOJI) {
        const result = await event_store.add_to_replacement(event.id, targetId);

        if (result.status === "in_main_list") {
            await reaction.users.remove(reactorId).catch(() => { });
            log.event.debug("⏰ reaction removed — user already in main list", { eventId: event.id, targetId, reactorId })
            return;
        }

        if (result.status === "not_found" || result.status === "already_in_list") {
            return;
        }

        log.event.debug("user added to replacement list via reaction", { eventId: event.id, targetId, reactorId, type: event.type })
        await updateEventEmbed(reaction.client, result.event).catch((err) =>
            log.event.warn("Failed to update embed after replacement list reaction", { err })
        );
    }
};


export async function logMpReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    event: EventSchema
): Promise<void> {
    const emoji = reaction.emoji.name;
    if (emoji !== MAIN_LIST_EMOJI && emoji !== REPLACEMENT_LIST_EMOJI) return;

    const resolved = await resolveReaction(reaction, user, event);
    if (!resolved) return;

    const { targetId, reactorId } = resolved;

    if (emoji === MAIN_LIST_EMOJI) {
        const result = await event_store.remove_from_main(event.id, targetId);
        if (result.status === "removed") {
            log.event.debug("User removed from main list via reaction", { eventId: event.id, targetId, reactorId, type: event.type })
            await updateEventEmbed(reaction.client, result.event).catch((err) =>
                log.event.warn("Failed to update embed after main list reaction remove", { err })
            );
        }
        return;
    }

    if (emoji === REPLACEMENT_LIST_EMOJI) {
        const result = await event_store.remove_from_replacement(event.id, targetId);
        if (result.status === "removed") {
            log.event.debug("User removed from replacement list via reaction", { eventId: event.id, targetId, reactorId, type: event.type })
            await updateEventEmbed(reaction.client, result.event).catch((err) =>
                log.event.warn("Failed to update embed after replacement list reaction remove", { err })
            );
        }
    }
}