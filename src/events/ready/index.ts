
import { ActivityType, Routes } from "discord.js";
import type { RESTPatchCurrentApplicationJSONBody, APIApplication } from "discord-api-types/v10";
import { BotEvent } from "../../types";

const DESCRIPTION = "Открытый доступ - https://github.com/14keta-dev/majestic-family-bot";

export default {
    name: "ready",
    once: true,
    execute: async (client) => {
        client.user.setPresence({
            status: "dnd",
        });

        try {
            const body: RESTPatchCurrentApplicationJSONBody = {
                description: DESCRIPTION,
            };

            await client.rest.patch(Routes.currentApplication(), { body }) as APIApplication;
        } catch (err) {
            console.error("Failed to update application description:", err);
        }
    },
} satisfies BotEvent<"ready">;