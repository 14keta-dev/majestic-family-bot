import { ButtonInteraction } from "discord.js";
import { VACATION_LIST_PAGINATION_CUSTOM_ID } from "../../embed/vacation/vacation.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { renderVacationListPage } from "../../utils/vacation/vacation_list.helper";

export default {
    customId: VACATION_LIST_PAGINATION_CUSTOM_ID.next,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton() || !interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, {
            button: "vacation_list_next",
        });

        try {
            const rawPage = interaction.customId.slice(VACATION_LIST_PAGINATION_CUSTOM_ID.next.length + 1);
            const currentPage = Number.parseInt(rawPage, 10);

            if (Number.isNaN(currentPage)) {
                log.button.error(meta, `Malformed pagination customId: ${interaction.customId}`);
                await interaction.deferUpdate();
                return;
            }

            const { embeds, components } = await renderVacationListPage(currentPage, 1);
            await interaction.update({ embeds, components });
        } catch (error) {
            log.button.error(meta, "Failed to handle vacation list next");
            await safeReply(interaction, error, "vacation_list_next.execute", interaction.id);
        }
    },
} satisfies Button;