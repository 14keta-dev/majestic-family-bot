import path from 'path';
import type { SelectMenu } from '../types';
import { walk } from '../utils/walk.helper';

const _selects: SelectMenu[] = [];
export { _selects as selects };

function isSelect(value: unknown): value is SelectMenu {
    return (
        typeof value === 'object' &&
        value !== null &&
        'customId' in value &&
        'execute' in value
    );
}

export function loadSelects() {
    const files = walk(path.join(__dirname, '..', 'selects'));
    for (const file of files) {
        const mod = require(file);
        const candidates = mod.default ? [mod.default] : Object.values(mod);
        for (const candidate of candidates) {
            if (isSelect(candidate)) {
                _selects.push(candidate);
            }
        }
    }
}