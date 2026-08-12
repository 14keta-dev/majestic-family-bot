import { rootLogger } from "./base";
import { toFile, onlyLevel, webhookTransport } from "./transports";
import { env } from "../env";
import { commandLogger } from "./modules/command";
import { eventLogger } from "./modules/event";
import { dbLogger } from "./modules/db";
import { buttonLogger } from "./modules/button";
import { modalLogger } from "./modules/modal";
import { selectLogger } from "./modules/select";

rootLogger.attachTransport(toFile("combined.log"));
rootLogger.attachTransport(toFile("errors.log", { minLevel: "ERROR" }));

if (env.WEBHOOK_URL) {
    rootLogger.attachTransport(onlyLevel(["ERROR", "FATAL"], webhookTransport()));
}

function fatal(...args: unknown[]) {
    rootLogger.fatal.apply(rootLogger, args as Parameters<typeof rootLogger.fatal>);
    handleFatal();
}

function handleFatal() {
    process.exit(1);
}

process.on("uncaughtException", (err) => {
    rootLogger.fatal(err);
    handleFatal();
});

export const log = {
    silly: rootLogger.silly.bind(rootLogger),
    trace: rootLogger.trace.bind(rootLogger),
    debug: rootLogger.debug.bind(rootLogger),
    info: rootLogger.info.bind(rootLogger),
    warn: rootLogger.warn.bind(rootLogger),
    error: rootLogger.error.bind(rootLogger),
    fatal,


    button: buttonLogger,
    command: commandLogger,
    event: eventLogger,
    db: dbLogger,
    modal: modalLogger,
    select: selectLogger,

    flush: () => rootLogger.flush(),
};