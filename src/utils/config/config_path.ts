
import { BotConfig, DeepPartial, DotPath } from ".";
import { DEFAULT_CONFIG } from "./default_path";
import { getByPath, setByPath } from "./path_utils";
import { updateConfig } from "./store";


export async function resetConfigSection(path: DotPath<BotConfig>): Promise<BotConfig | null> {
    const defaultValue = getByPath(DEFAULT_CONFIG, path);

    if (defaultValue === undefined) {
        return null;
    }

    const partial: DeepPartial<BotConfig> = setByPath({}, path, defaultValue);
    return updateConfig(partial);
}


export function listConfigPaths(obj: unknown = DEFAULT_CONFIG, prefix = ""): string[] {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
        return prefix ? [prefix] : [];
    }

    const paths: string[] = [];
    for (const key of Object.keys(obj as Record<string, unknown>)) {
        const value = (obj as Record<string, unknown>)[key];
        const fullPath = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
            paths.push(...listConfigPaths(value, fullPath));
        } else {
            paths.push(fullPath);
        }
    }
    return paths;
}