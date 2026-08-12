
import fs from 'fs';
import path from 'path';

const defaultExt = __filename.endsWith('.ts') ? '.ts' : '.js';

export function walk(dir: string, ext = defaultExt): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full, ext);
        return full.endsWith(ext) && entry.name !== `index${ext}` ? [full] : [];
    });
}