
import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const dbLogger = createLoggerModule({
    name: "db",
    transports: [toFile("db-errors.log", { minLevel: "ERROR" })],
});