import { EmbedBuilder, Message } from "discord.js";
import { BotEvent } from "../../types";
import { prefixCommands } from "../../loaders/prefixCommand.loader";
import { client } from "../../client";
import { env } from "../../utils/env";
import { log } from "../../utils/logger";

export default {
    name: "messageCreate",
    async execute(message: Message) {
        await Promise.allSettled([
            HandlePrefix({ message, prefix: env.PREFIX }),
        ]);
    },
} satisfies BotEvent<'messageCreate'>;

interface PrefixHandlerProps {
    message: Message;
    prefix: string;
}

async function HandlePrefix({
    message,
    prefix,
}: PrefixHandlerProps): Promise<void> {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    if (message.guildId !== env.GUILD_ID) return;

    const [commandName, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
    if (!commandName) return;

    const command = prefixCommands.get(commandName.toLowerCase());
    if (!command) return;

    try {
        await command.executePrefix(message, args, client);
    } catch (error) {
        log.command.error({ command: commandName }, "Prefix command threw an unhandled error");
        await message.reply({ content: "Произошла ошибка при выполнении команды." }).catch(() => undefined);
    }
}