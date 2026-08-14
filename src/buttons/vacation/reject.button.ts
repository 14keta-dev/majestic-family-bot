import { ButtonInteraction, MessageFlags } from "discord.js";
import { VACATION_REVIEW_CUSTOM_IDS } from "../../embed/vacation/vacation.components";
import { build_reject_vacation_modal } from "../../utils/vacation/reject_vacation.helper";
import { Button } from "../../types";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { vacation_store } from "../../utils/vacation/vacation.schema";

export default {
    customId: VACATION_REVIEW_CUSTOM_IDS.reject,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;
        if (!(await requireManageGuild(interaction))) return;

        const entryId = interaction.customId.slice(VACATION_REVIEW_CUSTOM_IDS.reject.length + 1);
        const meta = metaBuilder(interaction.member, { button: "vacation_request_reject" });

        try {
            const entry = vacation_store.get(entryId);
            if (!entry || entry.status !== null) {
                await interaction.reply({
                    content: "Заявка не найдена или уже была рассмотрена.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.showModal(build_reject_vacation_modal(entryId));
        } catch (error) {
            log.button.error(meta, "Failed to open vacation reject modal");
            await safeReply(interaction, error, "vacation_request_reject.execute", interaction.id);
        }
    },
} satisfies Button;