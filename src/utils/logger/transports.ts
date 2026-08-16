
import fs from "node:fs";
import path from "node:path";
import { LEVELS, type LogLevel, type LogRecord, type TransportFn } from "./types";
import { sendErrorWebhook } from "./webhook";

const LOGS_DIR = path.join(__dirname, "../../../logs");
fs.mkdirSync(LOGS_DIR, { recursive: true });

const streams = new Map<string, fs.WriteStream>();

function getStream(filename: string) {
    let stream = streams.get(filename);
    if (!stream) {
        stream = fs.createWriteStream(path.join(LOGS_DIR, filename), { flags: "a" });
        streams.set(filename, stream);
    }
    return stream;
}

function serializeArg(arg: unknown): unknown {
    if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: arg.stack };
    }
    return arg;
}

export function toFile(filename: string, opts?: { minLevel?: LogLevel }): TransportFn {
    const stream = getStream(filename);
    const minIndex = opts?.minLevel ? LEVELS.indexOf(opts.minLevel) : 0;

    return (record) => {
        if (LEVELS.indexOf(record.level) < minIndex) return;

        const line = JSON.stringify({
            date: record.date.toISOString(),
            level: record.levelName,
            name: record.name,
            args: record.args.map(serializeArg),
        });

        stream.write(line + "\n");
    };
}

export function onlyLevel(levels: string[], transport: TransportFn): TransportFn {
    return (record) => {
        if (levels.includes(record.levelName)) transport(record);
    };
}

function extractRecord(record: LogRecord): { message: string; meta: Record<string, unknown> } {
    const messageParts: string[] = [];
    const meta: Record<string, unknown> = {};

    for (const arg of record.args) {
        if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
            messageParts.push(String(arg));
        } else if (arg instanceof Error) {
            messageParts.push(arg.message);
            meta.errorName = arg.name;
            meta.stack = arg.stack;
        } else if (arg && typeof arg === "object") {
            Object.assign(meta, arg as Record<string, unknown>);
        }
    }

    meta.logger ??= record.name;

    return {
        message: messageParts.join(" ") || "(no message provided)",
        meta,
    };
}

export function webhookTransport(): TransportFn {
    return (record) => {
        if (record.levelName !== "ERROR" && record.levelName !== "FATAL") return;

        const { message, meta } = extractRecord(record);
        sendErrorWebhook({ level: record.levelName as "ERROR" | "FATAL", message, meta }).catch(() => { });
    };
}