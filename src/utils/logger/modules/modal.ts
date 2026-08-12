
import { createLoggerModule } from "../base";
import { toFile } from "../transports";

export const modalLogger = createLoggerModule({
    name: "modal",
    transports: [toFile("modal.log")]
})