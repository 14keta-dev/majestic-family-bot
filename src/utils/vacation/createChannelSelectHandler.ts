import { AnySelectMenuInteraction, GuildMember, MessageFlags } from "discord.js";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";
import { setVacationDraftField } from "./draft_store";
import { build_set_up_vacation_embed } from "../../embed/vacation/set_up.embed";
import { passesVacationSetupGuards } from "../../selects/vacation/set_up/selectGuards.helper";

type VacationChannelDraftKey = "panel_channel" | "incoming_request" | "vacation_log";

export function createVacationChannelSelectHandler(
  customId: string,
  draftKey: VacationChannelDraftKey,
): SelectMenu {
  return {
    customId,
    async execute(interaction: AnySelectMenuInteraction) {
      if (!interaction.isChannelSelectMenu()) return;
      if (!(await passesVacationSetupGuards(interaction))) return;

      const meta = metaBuilder(interaction.member as GuildMember, { select: `vacation_setup_${draftKey}` });

      try {
        const channelId = interaction.values[0];
        const updated = setVacationDraftField(interaction.message.id, draftKey, channelId);

        log.command.info(meta, `Updated vacation setup draft: ${draftKey}`);
        await interaction.update({
          components: build_set_up_vacation_embed(updated),
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (error) {
        log.command.error(meta, `Failed to update vacation setup draft (${draftKey})`);
        await safeReply(interaction, error, `vacation_setup.${draftKey}`, interaction.id);
      }
    },
  };
}