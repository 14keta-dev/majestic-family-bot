

import path from 'path';
import { Collection } from 'discord.js';
import type { PrefixCommand } from '../types';
import { walk } from '../utils/walk.helper';

export const prefixCommands = new Collection<string, PrefixCommand>();

export function loadPrefixCommands() {
    const files = walk(path.join(__dirname, '..', 'commands', 'prefix'));
    for (const file of files) {
        const command: PrefixCommand = require(file).default;
        prefixCommands.set(command.name, command);
        command.aliases?.forEach(alias => prefixCommands.set(alias, command));
    }
}