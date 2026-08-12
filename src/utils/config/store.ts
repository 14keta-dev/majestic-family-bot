

import fs from "fs";
import path from "path";
import { parsePartialConfig, validateFullConfig } from "./schema";
import { DEFAULT_CONFIG } from "./default_path";
import { deepFreeze, deepMerge } from "./path_utils";
import { BotConfig, DeepPartial } from "./types";

const CONFIG_PATH = process.env.CONFIG_PATH
    ? path.resolve(process.env.CONFIG_PATH)
    : path.resolve(process.cwd(), "config.json");


    
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

function loadFromDisk(): BotConfig {
    if (!fs.existsSync(CONFIG_PATH)) {

        
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
        console.log(`[config] No config.json found — generated a default one at ${CONFIG_PATH}`);
        return deepFreeze(structuredClone(DEFAULT_CONFIG));
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");

    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(raw);
    } catch (error) {
        throw new Error(`config.json is not valid JSON — refusing to fall back silently: ${(error as Error).message}`);
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
    const run = configWriteQueue.then(fn, fn);
    configWriteQueue = run.catch(() => undefined);
    return run;
}

async function persist(updated: BotConfig): Promise<BotConfig> {
    const validated = validateFullConfig(updated);
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(validated, null, 2), "utf-8");
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