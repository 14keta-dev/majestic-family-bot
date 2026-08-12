import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const buttonLogger = createLoggerModule({
    name: "button",
    transports: [toFile("button.log")]
})