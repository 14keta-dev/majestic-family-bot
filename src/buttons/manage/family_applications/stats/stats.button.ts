
import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS } from "../../../../embed/family_applications/manage.embed";
import { requireManageGuild } from "../../../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../../../utils/logger/met_builder";
import { log } from "../../../../utils/logger";
import { safeReply } from "../../../../utils/safeReply.helper";
import { getReviewerApplications } from "../../../../utils/family_applications/reviewer_stats_query";
import { manage_stats_family_applications } from "../../../../embed/family_applications/stats.embed";
import { Button } from "../../../../types";

export default {
    customId: MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.stats,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;
        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_family_applications_stats" });

        try {
            const applications = await getReviewerApplications();

            await interaction.editReply({
                components: manage_stats_family_applications({ applications, page: 0 }),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send family applications stats panel");
            await safeReply(interaction, error, "manage_family_applications_stats.execute", interaction.id);
        }
    },
} satisfies Button;