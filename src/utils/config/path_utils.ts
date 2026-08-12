
import { DeepPartial } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
    const result: T = { ...target };

    for (const key of Object.keys(source) as (keyof T)[]) {
        const value = source[key] as unknown;
        if (value === undefined) continue;

        if (isPlainObject(value)) {
            const base = isPlainObject(target[key]) ? (target[key] as object) : {};
            result[key] = deepMerge(base, value as DeepPartial<object>) as T[keyof T];
        } else {
            result[key] = value as T[keyof T];
        }
    }

    return result;
}

export function getByPath(obj: unknown, path: string): unknown {
    return path
        .split(".")
        .reduce<unknown>((acc, key) => (isPlainObject(acc) ? acc[key] : undefined), obj);
}


export function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
    const keys = path.split(".");
    const lastKey = keys.pop();
    if (!lastKey) return obj;

    const clone: Record<string, unknown> = structuredClone(obj);
    let cursor = clone;

    for (const key of keys) {
        if (!isPlainObject(cursor[key])) cursor[key] = {};
        cursor = cursor[key] as Record<string, unknown>;
    }

    cursor[lastKey] = value;
    return clone as T;
}

export function deepFreeze<T>(obj: T): T {
    if (isPlainObject(obj) || Array.isArray(obj)) {
        Object.values(obj as object).forEach(deepFreeze);
        Object.freeze(obj);
    }
    return obj;
}