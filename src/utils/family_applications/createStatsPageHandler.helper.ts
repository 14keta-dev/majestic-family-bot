
import { ButtonInteraction, MessageFlags } from "discord.js";
import { manage_stats_family_applications } from "../../embed/family_applications/stats.embed";
import { log } from "../logger";
import { safeReply } from "../safeReply.helper";
import { getReviewerApplications } from "./reviewer_stats_query";
import { metaBuilder } from "../logger/met_builder";
import { requireManageGuild } from "../permissions/requireManageGuild";
import { Button } from "../../types";


export function createStatsPageHandler(prefix: string): Button {
    return {
        customId: prefix,
        dynamic: true,
        deferUpdate: true,
        async execute(interaction: ButtonInteraction) {
            if (!interaction.inCachedGuild()) return;
            if (!(await requireManageGuild(interaction))) return;

            const meta = metaBuilder(interaction.member, { button: "manage_family_applications_stats_page" });

            try {
                const pageStr = interaction.customId.slice(prefix.length + 1); 
                const page = Number.parseInt(pageStr, 10);

                const applications = await getReviewerApplications();

                await interaction.editReply({
                    components: manage_stats_family_applications({
                        applications,
                        page: Number.isFinite(page) ? page : 0,
                    }),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.button.error(meta, "Failed to paginate family applications stats panel");
                await safeReply(interaction, error, "manage_family_applications_stats_page.execute", interaction.id);
            }
        },
    };
}