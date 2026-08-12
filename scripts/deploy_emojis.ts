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
import { env } from '../src/utils/env';

const EMOJI_DIR = join(process.cwd(), "emojis");
const TARGET_FILE = join(process.cwd(), "src/utils/emojis/emojis.ts");
const START_MARKER = "// === AUTO-GENERATED START ===";
const END_MARKER = "// === AUTO-GENERATED END ===";

const onlyFolder = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

type DeployedSet = Record<string, string>;
type RegistryEntry = { type: string; isBot: boolean; set: DeployedSet };

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
            `Add them to FOLDER_MAP in src/utils/config/emojis.ts before deploying.`
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
        const { key: registryKey, type: setType, isBot } = FOLDER_MAP[folder];
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

        registryOut[registryKey] = { type: setType, isBot, set };
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
    const existingBlockRegex = /const (\w+)Emojis: (\w+) = ({[\s\S]*?});/g;
    const preserved: Record<string, RegistryEntry> = {};
    let match;
    while ((match = existingBlockRegex.exec(before))) {
        const varName = match[1];
        const typeName = match[2];
        const mappedEntry = Object.entries(FOLDER_MAP).find(
            ([, v]) => `${v.key}Emojis` === `${varName}Emojis`
        )?.[1];
        const regKey = mappedEntry?.key ?? varName;
        if (!(regKey in registryOut)) {
            try {
                preserved[regKey] = {
                    type: typeName,
                    isBot: mappedEntry?.isBot ?? true,
                    set: JSON.parse(match[3].replace(/(\w+):/g, '"$1":').replace(/,(\s*})/g, "$1")),
                };
            } catch { }
        }
    }

    const merged = { ...preserved, ...registryOut };

    const lines: string[] = [START_MARKER];
    for (const [key, { type, set }] of Object.entries(merged)) {
        lines.push(`const ${key}Emojis: ${type} = {`);
        for (const [k, v] of Object.entries(set)) {
            lines.push(`    ${k}: "${v}",`);
        }
        lines.push("};\n");
    }
    lines.push("const registry = {");
    for (const [key, { isBot }] of Object.entries(merged)) {
        if (isBot) lines.push(`    ${key}: ${key}Emojis,`);
    }
    lines.push("};");
    lines.push(END_MARKER);

    const newContent = original.slice(0, startIdx) + lines.join("\n") + original.slice(endIdx + END_MARKER.length);
    writeFileSync(TARGET_FILE, newContent);
    console.log(`\nUpdated ${TARGET_FILE}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});