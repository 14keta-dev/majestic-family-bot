import { MessageReaction, PartialMessageReaction, User, PartialUser } from "discord.js";
import { BotEvent } from "../../types";
import { log } from "../../utils/logger";
import { metaBuilder } from "../../utils/logger/met_builder";
import { env } from "../../utils/env";
import { getTrackedMpThread, handle_mp_reaction } from "../../utils/EVENT/handle_reactions";

export default {
    name: "messageReactionAdd",
    async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (!reaction.message.guildId) return;

        const meta = metaBuilder(user as User, reaction.message.guildId, { event: "reactionAdd" });

        if (reaction.partial) {
            try {
                log.event.info(meta, "Rection added");
                await reaction.fetch();
            } catch (errro) {
                log.event.warn(meta, `Could not feth partial reaction error: ${errro}`)
                return;
            }
        }

        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (err) {
                log.event.warn(meta, "Failed to fetch partial message", { error: err });
                return;
            }
        }

        if (reaction.message.guildId !== env.GUILD_ID) return;

        const tracked = getTrackedMpThread(reaction.message.channel);

        if (!tracked) return;

        log.event.debug(meta, `Reaction added to tracked mp thred`, {
            eventId: tracked.event.id,
            userId: user.id,
            emoji: reaction.emoji.name
        });

        await handle_mp_reaction(reaction, user, tracked.event)
    }
} satisfies BotEvent<"messageReactionAdd">;