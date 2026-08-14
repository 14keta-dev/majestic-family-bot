import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { AFK_config_draft, getAfkDraft, setAfkDraftField } from "./draft_afk_store";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { build_set_up_afk_embed } from "../../embed/AFK/set_up.embed";
import { requireManageGuild } from "../permissions/requireManageGuild";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";

type AfkChannelDraftKey = Exclude<keyof AFK_config_draft, "initiatedBy" | "isEdit">;

export function createAfkChannelSelectHandler(customId: string, draftKey: AfkChannelDraftKey): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {

            if (!interaction.isChannelSelectMenu()) return;

            if (!interaction.inCachedGuild()) return;

            if (!(await requireManageGuild(interaction))) return;

            const draft = getAfkDraft(interaction.message.id);
            if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
                await interaction.reply({
                    content: "Эту настройку начал другой администратор. Попросите его завершить, либо начните заново.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const meta = metaBuilder(interaction.member, {
                select: `afk_setup_${draftKey}`,
            });

            try {
                const channelId = interaction.values[0];
                const updated = setAfkDraftField(interaction.message.id, draftKey, channelId);

                log.command.info(meta, `Updated AFK setup draft: ${draftKey}`);
                await interaction.update({
                    components: build_set_up_afk_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, `Failed to update AFK setup draft (${draftKey})`);
                await safeReply(interaction, error, `afk_setup.${draftKey}`, interaction.id);
            }
        },
    };
}