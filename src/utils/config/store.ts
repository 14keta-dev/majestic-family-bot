import fs from "fs";
import path from "path";
import { parsePartialConfig, validateFullConfig } from "./schema";
import { DEFAULT_CONFIG } from "./default_path";
import { deepFreeze, deepMerge } from "./path_utils";
import { BotConfig, DeepPartial } from "./types";

const CONFIG_PATH = process.env.CONFIG_PATH
    ? path.resolve(process.env.CONFIG_PATH)
    : path.resolve(process.cwd(), "config.json");

const TMP_PATH = `${CONFIG_PATH}.tmp`;
const BACKUP_PATH = `${CONFIG_PATH}.bak`;

function migrateLegacyKeys(raw: unknown): unknown {
    if (typeof raw !== "object" || raw === null) return raw;

    const config = raw as Record<string, any>;
    const channels = config.family_applications?.channels;

    if (channels && "accepted_acthive" in channels && !("accepted_archive" in channels)) {
        channels.accepted_archive = channels.accepted_acthive;
        delete channels.accepted_acthive;
    }

    return raw;
}

async function atomicWriteJson(targetPath: string, data: unknown): Promise<void> {
    const tmpPath = `${targetPath}.tmp`;
    const json = JSON.stringify(data, null, 2);

    const handle = await fs.promises.open(tmpPath, "w");
    try {
        await handle.writeFile(json, "utf-8");
        await handle.sync(); 
    } finally {
        await handle.close();
    }

    await fs.promises.rename(tmpPath, targetPath);
}

function ensureDirFor(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadFromDisk(): BotConfig {
    if (!fs.existsSync(CONFIG_PATH)) {
        ensureDirFor(CONFIG_PATH);

        const validatedDefault = validateFullConfig(structuredClone(DEFAULT_CONFIG));

        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(validatedDefault, null, 2), "utf-8");
        } catch (error) {
            throw new Error(
                `[config] No config.json found at ${CONFIG_PATH} and failed to create a default one: ${(error as Error).message}`,
            );
        }

        console.log(`[config] No config.json found — generated a default one at ${CONFIG_PATH}`);
        return deepFreeze(validatedDefault);
    }

    let raw: string;
    try {
        raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    } catch (error) {
        throw new Error(`[config] Failed to read ${CONFIG_PATH}: ${(error as Error).message}`);
    }

    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(raw);
    } catch (error) {
        // Don't fall back silently — but do point at the backup if one exists,
        // since that's the operator's fastest recovery path.
        const backupHint = fs.existsSync(BACKUP_PATH)
            ? ` A backup exists at ${BACKUP_PATH} — inspect it and restore manually if needed.`
            : "";
        throw new Error(
            `config.json is not valid JSON — refusing to fall back silently: ${(error as Error).message}.${backupHint}`,
        );
    }

    const migrated = migrateLegacyKeys(parsedJson);
    const partial = parsePartialConfig(migrated);
    const merged = deepMerge(DEFAULT_CONFIG, partial);

    return deepFreeze(validateFullConfig(merged));
}

let cached: BotConfig | null = null;

export function getConfig(): BotConfig {
    if (!cached) {
        cached = loadFromDisk();
    }
    return cached;
}

export function ensureConfig(): BotConfig {
    return getConfig();
}

let configWriteQueue: Promise<unknown> = Promise.resolve();

function queueConfigWrite<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = configWriteQueue.then(
        () => fn(),
        () => fn(), 
    );
    configWriteQueue = run.then(
        () => undefined,
        () => undefined,
    );
    return run;
}

async function persist(updated: BotConfig): Promise<BotConfig> {
    const validated = validateFullConfig(updated);
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            await fs.promises.copyFile(CONFIG_PATH, BACKUP_PATH);
        } catch (error) {
            console.warn(`[config] Failed to write backup before update: ${(error as Error).message}`);
        }
    }

    await atomicWriteJson(CONFIG_PATH, validated);
    cached = deepFreeze(validated);
    return cached;
}

export async function updateConfig(partial: DeepPartial<BotConfig>): Promise<BotConfig> {
    return queueConfigWrite(async () => {
        const updated = deepMerge(getConfig(), partial);
        return persist(updated);
    });
}

export async function mutateConfig<T>(
    mutator: (current: BotConfig) => { partial: DeepPartial<BotConfig>; result: T },
): Promise<T> {
    return queueConfigWrite(async () => {
        const { partial, result } = mutator(getConfig());
        const updated = deepMerge(getConfig(), partial);
        await persist(updated);
        return result;
    });
}