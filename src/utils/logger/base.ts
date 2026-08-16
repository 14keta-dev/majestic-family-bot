
import { LEVELS, type LogLevel, type LogRecord, type TransportFn } from "./types";

const LEVEL_COLOR: Record<LogLevel, string> = {
    silly: "\x1b[90m",
    trace: "\x1b[90m",
    debug: "\x1b[36m",
    info: "\x1b[32m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    fatal: "\x1b[41m\x1b[97m",
};
const RESET = "\x1b[0m";

export interface LoggerOptions {
    name: string;
    minLevel?: LogLevel;
    parent?: Logger;
}

export class Logger {
    readonly name: string;
    minLevel: LogLevel;
    private transports: TransportFn[] = [];
    private parent?: Logger;

    constructor(opts: LoggerOptions) {
        this.name = opts.name;
        this.minLevel = opts.minLevel ?? "silly";
        this.parent = opts.parent;
    }

    private shouldLog(level: LogLevel) {
        return LEVELS.indexOf(level) >= LEVELS.indexOf(this.minLevel);
    }

    private write(level: LogLevel, args: unknown[]) {
        if (!this.shouldLog(level)) return;

        const record: LogRecord = {
            level,
            levelName: level.toUpperCase(),
            date: new Date(),
            name: this.name,
            args,
        };

        this.print(record);
        this.dispatch(record);
    }

    private print(record: LogRecord) {
        const color = LEVEL_COLOR[record.level];
        const ts = record.date.toISOString();
        const prefix = `${ts}\t${color}${record.levelName.padEnd(5)}${RESET}\t[${record.name}]`;
        const method =
            record.level === "error" || record.level === "fatal"
                ? console.error
                : record.level === "warn"
                    ? console.warn
                    : console.log;
        method(prefix, ...record.args);
    }

    private dispatch(record: LogRecord) {
        for (const t of this.transports) t(record);
        this.parent?.dispatch(record);
    }

    attachTransport(fn: TransportFn) {
        this.transports.push(fn);
    }

    getSubLogger(opts: { name: string; minLevel?: LogLevel }) {
        return new Logger({
            name: `${this.name}:${opts.name}`,
            minLevel: opts.minLevel ?? this.minLevel,
            parent: this,
        });
    }

    silly = (...args: unknown[]) => this.write("silly", args);
    trace = (...args: unknown[]) => this.write("trace", args);
    debug = (...args: unknown[]) => this.write("debug", args);
    info = (...args: unknown[]) => this.write("info", args);
    warn = (...args: unknown[]) => this.write("warn", args);
    error = (...args: unknown[]) => this.write("error", args);
    fatal = (...args: unknown[]) => this.write("fatal", args);

    flush() {
    }
}

export const rootLogger = new Logger({
    name: "bot",
    minLevel: process.env.NODE_ENV === "production" ? "info" : "silly",
});

export interface LoggerModuleOptions {
    name: string;
    minLevel?: LogLevel;
    transports?: TransportFn[];
}

export function createLoggerModule({ name, minLevel, transports = [] }: LoggerModuleOptions) {
    const sub = rootLogger.getSubLogger({ name, minLevel });
    for (const transport of transports) {
        sub.attachTransport(transport);
    }
    return sub;
}