import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS } from "../../../embed/family_applications/manage.embed";
import { manage_cooldown_family_applications } from "../../../embed/family_applications/cooldown.embed";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { getConfig } from "../../../utils/config/store";
import { getActiveCooldownApplications } from "../../../utils/family_applications/active_cooldown";

export default {
    customId: MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.cooldown,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "family_applications_manage_cooldown" });

        try {
            const applications = await getActiveCooldownApplications();
            const config = getConfig();

            const components = manage_cooldown_family_applications({
                applications,
                page: 0,
                archiveChannelId: config.family_applications.channels.rejected_archive,
                guildId: interaction.guildId,
            });

            await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            log.button.error(meta, "Failed to fetch applications on cooldown");
            await safeReply(interaction, error, "family_applications_manage_cooldown.fetch", interaction.id);
        }
    }
} satisfies Button;