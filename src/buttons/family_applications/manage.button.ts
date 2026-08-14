
import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../../embed/commands/menu.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { getConfig } from "../../utils/config/store";
import { are_family_application_channels_configured } from "../../utils/family_applications/isConfigured";
import { initDraft } from "../../utils/family_applications/setupDraftStore";
import { build_set_up_family_applications_embed } from "../../embed/family_applications/set_up.embed";
import { getManageSummaryApplications } from "../../utils/family_applications/manage_summary_query";
import { manage_family_applications_embed } from "../../embed/family_applications/manage.embed";

export default {
    customId: MANAGE_MENU_CUSTOM_ID.family_applications,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_family_applications" });

        try {
            const config = getConfig();

            if (!are_family_application_channels_configured(config.family_applications)) {

                const draft = initDraft(interaction.message.id, interaction.user.id);
                await interaction.editReply({
                    components: build_set_up_family_applications_embed(draft),
                    flags: MessageFlags.IsComponentsV2,
                });
                return;
            }

            const applications = await getManageSummaryApplications();

            await interaction.editReply({
                components: manage_family_applications_embed({
                    applications,
                    active: config.family_applications.active,
                }),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send family applications panel");
            await safeReply(interaction, error, "manage_family_applications.execute", interaction.id);
        }
    },
} satisfies Button;