// src/client.ts
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { SlashCommand } from './types/slashCommand.types';
import type { Button } from './types/button.types';
import type { Modal } from './types/modal.types';
import type { PrefixCommand } from './types/prefix.types';
import { SelectMenu } from './types';

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, SlashCommand>;
        buttons: Collection<string, Button>;
        modals: Collection<string, Modal>;
        selectMenus: Collection<string, SelectMenu>;
        prefixCommands: Collection<string, PrefixCommand>;
    }
}

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.Channel,
    ],
});