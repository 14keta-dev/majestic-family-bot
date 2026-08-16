
export type LogLevel = "silly" | "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LEVELS: LogLevel[] = ["silly", "trace", "debug", "info", "warn", "error", "fatal"];

export interface LogRecord {
    level: LogLevel;
    levelName: string;
    date: Date;
    name: string;
    args: unknown[];
}

export type TransportFn = (record: LogRecord) => void;