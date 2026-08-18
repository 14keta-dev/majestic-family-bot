import { AnySelectMenuInteraction, GuildMember, MessageFlags } from "discord.js";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";
import { setBackpackDraftField } from "./draft";
import { build_set_up_backpack_embed } from "../../embed/bacpack/set_up.embed";

type BackpackChannelDraftKey = "panel_channel";

export function createBackpackChannelSelectHandler(
    customId: string,
    draftKey: BackpackChannelDraftKey,
): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {
            if (!interaction.isChannelSelectMenu()) return;

            const meta = metaBuilder(interaction.member as GuildMember, { select: `backpack_setup_${draftKey}` });

            try {
                const channelId = interaction.values[0];
                const updated = setBackpackDraftField(interaction.message.id, draftKey, channelId);

                log.command.info(meta, `Updated backpack setup draft: ${draftKey}`);
                await interaction.update({
                    components: build_set_up_backpack_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, `Failed to update backpack setup draft (${draftKey})`);
                await safeReply(interaction, error, `backpack_setup.${draftKey}`, interaction.id);
            }
        },
    };
}