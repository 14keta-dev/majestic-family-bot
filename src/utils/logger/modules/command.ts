
import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const commandLogger = createLoggerModule({
    name: "command",
    transports: [toFile("commands.log")],
});