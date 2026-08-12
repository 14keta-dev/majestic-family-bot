import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import type { SlashCommand } from '../types';
import { walk } from '../utils/walk.helper';

export const commands = new Collection<string, SlashCommand>();

export function loadCommands() {
    const files = walk(path.join(__dirname, '..', 'commands', 'slash')).filter((f) => f.endsWith('.js'));

    for (const file of files) {
        const mod = require(file);
        const command: SlashCommand | undefined = mod.default;

        if (!command || !command.data) {
            console.error(`[slashCommand.loader] Skipping "${file}" — no valid default export`);
            continue;
        }

        commands.set(command.data.name, command);
    }
}