// scripts/deploy-emojis.ts
import { Client, GatewayIntentBits } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
    getSubfolders,
    getEmojiFilesRecursive,
    findDuplicateKeys,
    formatEmojiTag,
} from "../src/utils/emojis/helper";
import { FOLDER_MAP } from "../src/utils/emojis/folderMap";
import { env } from "../src/utils/env";

const EMOJI_DIR = join(process.cwd(), "emojis");
const TARGET_FILE = join(process.cwd(), "src/utils/emojis/emojis.ts");
const START_MARKER = "// === AUTO-GENERATED START ===";
const END_MARKER = "// === AUTO-GENERATED END ===";

const onlyFolder = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined;
const dryRun = process.argv.includes("--dry-run");

type DeployedSet = Record<string, string>;
type RegistryEntry = { isBot: boolean; set: DeployedSet };

/** snake_case / kebab-case -> camelCase. "temp_voice" -> "tempVoice", "assets" -> "assets". */
function toCamelCase(s: string): string {
    return s
        .toLowerCase()
        .replace(/[_-]+([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** camelCase -> PascalCase, for type names. "tempVoice" -> "TempVoice". */
function toPascalCase(s: string): string {
    const camel = toCamelCase(s);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Quote an object key only if it isn't a valid JS identifier. */
function propKey(k: string): string {
    return /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
}

async function main() {
    if (!env.TOKEN) {
        throw new Error("DISCORD_TOKEN env var is required");
    }

    const folders = getSubfolders(EMOJI_DIR).filter((f) => !onlyFolder || f === onlyFolder);

    if (folders.length === 0) {
        throw new Error(`No matching folders found under ${EMOJI_DIR}`);
    }

    const unmapped = folders.filter((f) => !FOLDER_MAP[f]);
    if (unmapped.length > 0) {
        throw new Error(
            `Folder(s) not in FOLDER_MAP: ${unmapped.join(", ")}\n` +
            `Add them to FOLDER_MAP in src/utils/emojis/folderMap.ts before deploying.`
        );
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(env.TOKEN);
    await client.application?.fetch();

    if (!client.application) {
        throw new Error("Could not resolve application — check the bot token");
    }

    const existing = await client.application.emojis.fetch();
    const existingByName = new Map(existing.map((e) => [e.name, e]));

    const registryOut: Record<string, RegistryEntry> = {};

    for (const folder of folders) {
        const { key: registryKey, isBot } = FOLDER_MAP[folder];
        const folderPath = join(EMOJI_DIR, folder);
        const files = getEmojiFilesRecursive(folderPath);

        console.log(`\n--- ${folder} -> registry["${registryKey}"] (${files.length} files found) ---`);

        const dupes = findDuplicateKeys(files);
        for (const [key, paths] of dupes) {
            console.warn(`  [warn] duplicate key "${key}": ${paths.join(" vs ")}`);
        }

        const set: DeployedSet = {};

        for (const { key, path, animated } of files) {
            const alreadyDeployed = existingByName.get(key);

            if (alreadyDeployed) {
                console.log(`  [skip] ${key} already exists (id: ${alreadyDeployed.id})`);
                set[key] = formatEmojiTag(key, alreadyDeployed.id, !!alreadyDeployed.animated);
                continue;
            }

            if (dryRun) {
                console.log(`  [dry-run] would upload ${key} from ${path}`);
                set[key] = formatEmojiTag(key, "DRY_RUN_ID", animated);
                continue;
            }

            try {
                const created = await client.application.emojis.create({ name: key, attachment: path });
                console.log(`  [uploaded] ${key} -> id: ${created.id}`);
                set[key] = formatEmojiTag(key, created.id, animated);
                await new Promise((r) => setTimeout(r, 300));
            } catch (err) {
                console.error(`  [error] failed to upload ${key}:`, (err as Error).message);
            }
        }

        registryOut[registryKey] = { isBot, set };
    }

    if (!dryRun) writeGeneratedBlock(registryOut);
    else console.log("\n[dry-run] not writing to emojis.ts");

    await client.destroy();
}

function writeGeneratedBlock(registryOut: Record<string, RegistryEntry>) {
    const original = readFileSync(TARGET_FILE, "utf-8");
    const startIdx = original.indexOf(START_MARKER);
    const endIdx = original.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error(`Could not find generated-block markers in ${TARGET_FILE}. Did someone edit them?`);
    }

    const before = original.slice(startIdx, endIdx);

    // Preserve sets for folders not touched in this run (e.g. `-- temp_voice`).
    const existingBlockRegex = /const (\w+)Emojis = ({[\s\S]*?}) as const;/g;
    const preserved: Record<string, RegistryEntry> = {};
    let match: RegExpExecArray | null;
    while ((match = existingBlockRegex.exec(before))) {
        const varName = match[1]; // camelCase, e.g. "tempVoice"
        const mappedEntry = Object.entries(FOLDER_MAP).find(
            ([, v]) => toCamelCase(v.key) === varName
        );
        if (!mappedEntry) continue;
        const [, entryDef] = mappedEntry;
        if (entryDef.key in registryOut) continue;

        try {
            const jsonish = match[2]
                .replace(/(["\w$]+)\s*:/g, (m, k: string) => `${JSON.stringify(k.replace(/"/g, ""))}:`)
                .replace(/,(\s*})/g, "$1");
            preserved[entryDef.key] = {
                isBot: entryDef.isBot,
                set: JSON.parse(jsonish),
            };
        } catch {
            console.warn(`  [warn] could not preserve existing set for "${entryDef.key}", it will be dropped`);
        }
    }

    const merged = { ...preserved, ...registryOut };

    const lines: string[] = [START_MARKER];

    // 1. Emit the raw const objects with literal-key inference (`as const`, no type annotation).
    for (const [key, { set }] of Object.entries(merged)) {
        const varName = toCamelCase(key);
        lines.push(`const ${varName}Emojis = {`);
        for (const [k, v] of Object.entries(set)) {
            lines.push(`    ${propKey(k)}: "${v}",`);
        }
        lines.push(`} as const;\n`);
    }

    // 2. Derive a *EmojiKey / *EmojiSet type pair per folder from the literal keys.
    for (const key of Object.keys(merged)) {
        const varName = toCamelCase(key);
        const typeBase = toPascalCase(key);
        lines.push(`export type ${typeBase}EmojiKey = keyof typeof ${varName}Emojis;`);
        lines.push(`export type ${typeBase}EmojiSet = Record<${typeBase}EmojiKey, string>;\n`);
    }

    // 3. Bot-variant folders go into the registry used to resolve BOT_ID.
    lines.push("const registry = {");
    for (const [key, { isBot }] of Object.entries(merged)) {
        if (isBot) lines.push(`    ${key}: ${toCamelCase(key)}Emojis,`);
    }
    lines.push("};\n");

    // 4. Flat (non-bot) folders get a stable `bot<Name>Emojis` export right in the block.
    for (const [key, { isBot }] of Object.entries(merged)) {
        if (isBot) continue;
        const varName = toCamelCase(key);
        const typeBase = toPascalCase(key);
        lines.push(
            `export const bot${typeBase}Emojis: ${typeBase}EmojiSet = ${varName}Emojis;`
        );
    }

    lines.push(END_MARKER);

    const newContent =
        original.slice(0, startIdx) + lines.join("\n") + original.slice(endIdx + END_MARKER.length);
    writeFileSync(TARGET_FILE, newContent);
    console.log(`\nUpdated ${TARGET_FILE}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});