import { readdirSync, statSync, Dirent } from "fs";
import { join, basename, extname } from "path";

export const VALID_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

export interface EmojiFile {
    key: string;
    path: string;
    animated: boolean;
}

export function getSubfolders(dir: string): string[] {
    return readdirSync(dir).filter((f) => statSync(join(dir, f)).isDirectory());
}

export function getEmojiFilesRecursive(dir: string): EmojiFile[] {
    const entries: Dirent[] = readdirSync(dir, { withFileTypes: true });
    const results: EmojiFile[] = [];

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            results.push(...getEmojiFilesRecursive(fullPath));
            continue;
        }

        if (!VALID_EXT.includes(extname(entry.name).toLowerCase())) continue;

        results.push({
            key: basename(entry.name, extname(entry.name)),
            path: fullPath,
            animated: extname(entry.name).toLowerCase() === ".gif",
        });
    }

    return results;
}

export function findDuplicateKeys(files: EmojiFile[]): Map<string, string[]> {
    const seen = new Map<string, string[]>();
    for (const f of files) {
        const existing = seen.get(f.key) ?? [];
        existing.push(f.path);
        seen.set(f.key, existing);
    }
    for (const [key, paths] of seen) {
        if (paths.length < 2) seen.delete(key);
    }
    return seen;
}

export function formatEmojiTag(name: string, id: string, animated: boolean): string {
    return `<${animated ? "a" : ""}:${name}:${id}>`;
}