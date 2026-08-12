import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const selectLogger = createLoggerModule({
    name: "select",
    transports: [toFile("select.log")]
})