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
rootLogger.attachTransport(toFile("errors.log", { minLevel: "error" }));

if (env.WEBHOOK_URL) {
    rootLogger.attachTransport(onlyLevel(["ERROR", "FATAL"], webhookTransport()));
}

function fatal(...args: unknown[]) {
    rootLogger.fatal(...args);
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
    silly: rootLogger.silly,
    trace: rootLogger.trace,
    debug: rootLogger.debug,
    info: rootLogger.info,
    warn: rootLogger.warn,
    error: rootLogger.error,
    fatal,

    button: buttonLogger,
    command: commandLogger,
    event: eventLogger,
    db: dbLogger,
    modal: modalLogger,
    select: selectLogger,

    flush: () => rootLogger.flush(),
};