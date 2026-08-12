
import fs from 'fs';
import path from 'path';
import { client } from '../client';
import type { BotEvent } from '../types';

export function loadEvents() {
    const dir = path.join(__dirname, '..', 'events');
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const filePath = entry.isDirectory()
            ? path.join(dir, entry.name, 'index.js')
            : path.join(dir, entry.name);

        if (!filePath.endsWith('.js')) continue;
        if (!fs.existsSync(filePath)) continue;

        const event: BotEvent = require(filePath).default;

        if (event.once) {
            client.once(event.name, event.execute as (...args: unknown[]) => void);
        } else {
            client.on(event.name, event.execute as (...args: unknown[]) => void);
        }
    }
}