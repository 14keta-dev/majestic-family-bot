import { Majestic_Servers } from "../emojis/server_emoji_map";
import { BotConfig } from "./types";

export const DEFAULT_CONFIG: BotConfig = {
    family_applications: {
        active: true,
        server: Majestic_Servers.New_York,
        channels: {
            apply_channel: "",
            incoming_applications: "",
            interview_channel: "",
            accepted_archive: "",
            rejected_archive: "",
        },
        apply_messageId: null,
        priority_roles: [""]
    },
    AFK: {
        panel_channel: "",
        panel_message: ""
    },
    logs: {
        category: "",
        afk_log: ""
    },
    vacation: {
        controlled: false,
        vacation_role: "",
        panel_channel: "",
        panel_message: ""
    }
};