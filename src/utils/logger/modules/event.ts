import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const eventLogger = createLoggerModule({
    name: "event",
    transports: [toFile("events.log")],
});