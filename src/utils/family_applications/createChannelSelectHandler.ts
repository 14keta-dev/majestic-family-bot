import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { FamilyApplicationsSetupDraft, getDraft, setDraftField } from "./setupDraftStore";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { build_set_up_family_applications_embed } from "../../embed/family_applications/set_up.embed";
import { requireManageGuild } from "../permissions/requireManageGuild";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";

type ChannelDraftKey = Exclude<keyof FamilyApplicationsSetupDraft, "server" | "initiatedBy" | "priority_roles">;


export function createChannelSelectHandler(customId: string, draftKey: ChannelDraftKey): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {
        
            if (!interaction.isChannelSelectMenu()) return;
          
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

            const meta = metaBuilder(interaction.member, {
                select: `family_applications_setup_${draftKey}`,
            });

            try {
                const channelId = interaction.values[0];
                const updated = setDraftField(interaction.message.id, draftKey, channelId);

                log.command.info(meta, `Updated family applications setup draft: ${draftKey}`);
                await interaction.update({
                    components: build_set_up_family_applications_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, `Failed to update family applications setup draft (${draftKey})`);
                await safeReply(interaction, error, `family_applications_setup.${draftKey}`, interaction.id);
            }
        },
    };
}