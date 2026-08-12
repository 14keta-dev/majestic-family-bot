
import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS, manage_family_applications_embed } from "../../../embed/family_applications/manage.embed";
import { buildApplyEmbed } from "../../../embed/family_applications/apply.embed";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { getManageSummaryApplications } from "../../../utils/family_applications/manage_summary_query";
import { getConfig, updateConfig } from "../../../utils/config/store";
import { Button } from "../../../types";

export default {
    customId: MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.toggle_status,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_family_applications_toggle_status" });

        try {
            const current = getConfig();
            const nextActive = !current.family_applications.active;

            const updated = await updateConfig({
                family_applications: { active: nextActive },
            });

            const { apply_channel } = updated.family_applications.channels;
            const applyMessageId = updated.family_applications.apply_messageId;

            if (apply_channel && applyMessageId) {
                try {
                    const channel = await interaction.guild.channels.fetch(apply_channel);
                    if (channel?.isTextBased()) {
                        const applyMessage = await channel.messages.fetch(applyMessageId);
                        await applyMessage.edit({
                            components: buildApplyEmbed(updated.family_applications),
                            flags: MessageFlags.IsComponentsV2,
                        });
                    }
                } catch (error) {
                    log.button.error(meta, `Could not update live apply message after status toggle error:${error}`);
                }
            }

            const applications = await getManageSummaryApplications();

            await interaction.editReply({
                components: manage_family_applications_embed({
                    applications,
                    active: updated.family_applications.active,
                }),
                flags: MessageFlags.IsComponentsV2,
            });

            log.button.info(meta, `Family applications ${nextActive ? "opened" : "closed"} by ${interaction.user.id}`);
        } catch (error) {
            log.button.error(meta, "Failed to toggle family applications status");
            await safeReply(interaction, error, "manage_family_applications_toggle_status.execute", interaction.id);
        }
    },
} satisfies Button;