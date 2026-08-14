import { AnySelectMenuInteraction, GuildMember, MessageFlags } from "discord.js";
import { build_set_up_vacation_embed, SET_UP_VACATION_CUSTOM_ID } from "../../../embed/vacation/set_up.embed";
import { getVacationDraft, setVacationDraftType } from "../../../utils/vacation/draft_store";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { safeReply } from "../../../utils/safeReply.helper";
import { log } from "../../../utils/logger";
import { SelectMenu } from "../../../types";
import { passesVacationDraftOwnerGuard } from "./selectGuards.helper";

export default {
    customId: SET_UP_VACATION_CUSTOM_ID.type_select,
    async execute(interaction: AnySelectMenuInteraction) {
        if (!interaction.isStringSelectMenu()) return;

        if (!(await passesVacationDraftOwnerGuard(interaction))) return;

        const draft = getVacationDraft(interaction.message.id);
        const meta = metaBuilder(interaction.member as GuildMember, { select: "vacation_setup_type" });

        try {
            const controlled = interaction.values[0] === "controlled";
            const updated = setVacationDraftType(interaction.message.id, controlled);

            log.command.info(meta, `Updated vacation setup draft: type=${controlled ? "controlled" : "free"}`);
            await interaction.update({
                components: build_set_up_vacation_embed(updated),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.command.error(meta, "Failed to update vacation setup draft (type)");
            await safeReply(interaction, error, "vacation_setup.type", interaction.id);
        }
    },
} satisfies SelectMenu;