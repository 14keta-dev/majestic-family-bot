
import path from 'path';
import type { Button } from '../types';
import { walk } from '../utils/walk.helper';

const _buttons: Button[] = [];
export { _buttons as buttons };

function isButton(value: unknown): value is Button {
    return (
        typeof value === 'object' &&
        value !== null &&
        'customId' in value &&
        'execute' in value
    );
}

export function loadButtons() {
    const files = walk(path.join(__dirname, '..', 'buttons'));
    for (const file of files) {
        const mod = require(file);
        const candidates = Object.values(mod); 
        for (const candidate of candidates) {
            if (isButton(candidate)) {
                _buttons.push(candidate);
            }
        };
        
    }
}