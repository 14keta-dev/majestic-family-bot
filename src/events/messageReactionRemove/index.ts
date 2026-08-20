import { MessageReaction, PartialMessageReaction, User, PartialUser } from "discord.js";
import { BotEvent } from "../../types";
import { env } from "../../utils/env";
import { log } from "../../utils/logger";
import { getTrackedMpThread, logMpReactionRemove } from "../../utils/EVENT/handle_reactions";

export default {
    name: "messageReactionRemove",
    async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                log.event.warn("Failed to fetch partial reaction", { error: err });
                return;
            }
        }

        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (err) {
                log.event.warn("Failed to fetch partial message", { error: err });
                return;
            }
        }

        if (reaction.message.guildId !== env.GUILD_ID) return;

        const tracked = getTrackedMpThread(reaction.message.channel);
        if (!tracked) return;


        await logMpReactionRemove(reaction, user, tracked.event);
    },
} satisfies BotEvent<"messageReactionRemove">;