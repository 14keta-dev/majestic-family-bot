import path from "node:path";
import { fileTransport } from "tslog/transports/file";
import type { TLogLevel } from "tslog";
import type { AttachableTransport, LogRecord, TransportFn } from "./base";
import { sendErrorWebhook } from "./webhook";

const LOGS_DIR = path.join(__dirname, "../../../logs");

export function toFile(filename: string, opts?: { minLevel?: TLogLevel }) {
    return fileTransport({
        path: path.join(LOGS_DIR, filename),
        append: true,
        format: "json",
        minLevel: opts?.minLevel,
    });
}

export function onlyLevel(levels: string[], transport: (record: LogRecord) => void): AttachableTransport {
    return (record: LogRecord) => {
        if (levels.includes(record._logMeta.logLevelName)) transport(record);
    };
}

function extractRecord(record: LogRecord): { message: string; meta: Record<string, unknown> } {
    const args: unknown[] = [];
    let i = 0;
    while (Object.prototype.hasOwnProperty.call(record, i)) {
        args.push((record as unknown as Record<number, unknown>)[i]);
        i++;
    }

    const messageParts: string[] = [];
    const meta: Record<string, unknown> = {};

    for (const arg of args) {
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

    if (record._logMeta.name) meta.logger ??= record._logMeta.name;

    return {
        message: messageParts.join(" ") || "(no message provided)",
        meta,
    };
}

export function webhookTransport(): TransportFn {
    return (record: LogRecord) => {
        const level = record._logMeta.logLevelName;
        if (level !== "ERROR" && level !== "FATAL") return; 

        const { message, meta } = extractRecord(record);
        sendErrorWebhook({ level, message, meta }).catch(() => {
        });
    };
}