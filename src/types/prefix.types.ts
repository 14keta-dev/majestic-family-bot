
import { Message, Client } from "discord.js";

export interface PrefixCommand {
    name: string;
    aliases?: string[];
    description?: string;
    typing?: boolean;
    executePrefix(
        message: Message,
        args: string[],
        client: Client,
    ): Promise<void>;
}