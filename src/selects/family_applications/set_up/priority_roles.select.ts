
import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { SelectMenu } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";
import { getDraft, setDraftField } from "../../../utils/family_applications/setupDraftStore";
import { build_set_up_family_applications_embed, SETUP_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../embed/family_applications/set_up.embed";

export default {
    customId: SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.priority_roles,
    async execute(interaction: AnySelectMenuInteraction) {

        if (!interaction.isRoleSelectMenu()) return;
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const draft = getDraft(interaction.message.id);
        if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
            await interaction.reply({
                content: "Эту настройку начал другой администратор. Попросите его завершить, либо начните заново.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const meta = metaBuilder(interaction.member, { select: "family_applications_setup_priority_roles" });

        try {

            const roleIds = interaction.values;
            const updated = setDraftField(interaction.message.id, "priority_roles", roleIds);

            log.command.info(meta, `Updated family applications setup draft: priority_roles (${roleIds.length})`);
            await interaction.update({
                components: build_set_up_family_applications_embed(updated),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.command.error(meta, "Failed to update family applications setup draft (priority_roles)");
            await safeReply(interaction, error, "family_applications_setup.priority_roles", interaction.id);
        }
    },
} satisfies SelectMenu;