import path from 'path';
import type { Modal } from '../types';
import { walk } from '../utils/walk.helper';

const _modals: Modal[] = [];
export { _modals as modals };

function isModal(value: unknown): value is Modal {
    return (
        typeof value === 'object' &&
        value !== null &&
        'customId' in value &&
        'execute' in value
    );
}

export function loadModals() {
    const files = walk(path.join(__dirname, '..', 'modals'));
    for (const file of files) {
        const mod = require(file);
        const candidates = mod.default ? [mod.default] : Object.values(mod);
        for (const candidate of candidates) {
            if (isModal(candidate)) {
                _modals.push(candidate);
            }
        }
    }
}