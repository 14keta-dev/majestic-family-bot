import { Routes } from "discord.js";
import type { RESTPatchCurrentApplicationJSONBody, APIApplication } from "discord-api-types/v10";
import { BotEvent } from "../../types";
import { startAfkAutokickScheduler } from "../../utils/AFK/afk_autokick_scheduler";
import { startAfkDraftSweeper } from "../../utils/AFK/draft_afk_store";
import { startDraftSweeper } from "../../utils/family_applications/setupDraftStore";
import { startVacationExpirySweeper } from "../../utils/vacation/expirySweeper.helper";

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

        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error("No guild found in cache on ready — AFK autokick scheduler not started.");
        } else {
            startAfkAutokickScheduler(client, guild.id);
        }

        startAfkDraftSweeper();
        startDraftSweeper();
        startVacationExpirySweeper(client);
    },
} satisfies BotEvent<"ready">;