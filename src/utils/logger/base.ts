import { Logger, type ILogObj, type ILogObjMeta, type TLogLevel } from "tslog";

export type LogRecord = ILogObj & ILogObjMeta;

export type AttachableTransport = Parameters<typeof rootLogger.attachTransport>[0];

export type TransportFn = (record: LogRecord) => void;

export interface LoggerModuleOptions {
    name: string;
    minLevel?: TLogLevel;
    transports?: AttachableTransport[];
}

export const rootLogger = new Logger({
    name: "bot",
    type: "pretty",
    minLevel: process.env.NODE_ENV === "production" ? "INFO" : "SILLY",
    pretty: {
        template: "{{dateIsoStr}}\t{{logLevelName}}\t[{{name}}]\t",
        style: true,
        timeZone: "UTC",
    },
});

export function createLoggerModule({ name, minLevel, transports = [] }: LoggerModuleOptions) {
    const sub = rootLogger.getSubLogger({ name, minLevel });
    for (const transport of transports) {
        sub.attachTransport(transport);
    }
    return sub;
}