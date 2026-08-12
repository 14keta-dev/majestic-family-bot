// src/deploy.ts
import { REST, Routes } from 'discord.js';
import type { SlashCommand } from './types';
import path from 'path';
import { env } from './utils/env';
import { walk } from './utils/walk.helper';

const rest = new REST().setToken(env.TOKEN);

export async function deploy() {
    const files = walk(path.join(__dirname, 'commands', 'slash'));
    const body = files.map(file => {
        const command: SlashCommand = require(file).default;
        return command.data.toJSON();
    });

    if (env.GUILD_ID) {
        await rest.put(
            Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
            { body }
        );
        console.log(`Deployed ${body.length} commands to guild ${env.GUILD_ID}`);
    } else {
        await rest.put(
            Routes.applicationCommands(env.CLIENT_ID),
            { body }
        );
        console.log(`✅ Deployed ${body.length} commands globally`);
    }
}

deploy().catch(console.error);