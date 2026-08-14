
import { ButtonInteraction, MessageFlags } from "discord.js";
import { COOLDOWN_PAGINATION_CUSTOM_IDS, manage_cooldown_family_applications } from "../../../embed/family_applications/cooldown.embed";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { getConfig } from "../../../utils/config/store";
import { Button } from "../../../types";
import { getActiveCooldownApplications } from "../../../utils/family_applications/active_cooldown";


async function execute(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.member) return;
    if (!interaction.inCachedGuild()) return;

    const meta = metaBuilder(interaction.member, { button: "family_applications_cooldown_pagination" });

    const pageRaw = interaction.customId.split(":").pop();
    const page = pageRaw ? parseInt(pageRaw, 10) : NaN;

    if (pageRaw === undefined || Number.isNaN(page) || page < 0) {
        log.button.error(meta, "Missing or invalid page in customId");
        await safeReply(
            interaction,
            new Error(`Malformed customId: ${interaction.customId}`),
            "family_applications_cooldown_pagination.parseCustomId",
            interaction.id,
        );
        return;
    }

    try {
        const applications = await getActiveCooldownApplications();
        const familyConfig = getConfig().family_applications;

        const components = manage_cooldown_family_applications({
            applications,
            guildId: interaction.guildId,
            archiveChannelId: familyConfig.channels.rejected_archive,
            page,
        });

        await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
        log.button.error(meta, "Failed to paginate cooldown list");
        await safeReply(interaction, error, "family_applications_cooldown_pagination.update", interaction.id);
    }
}

export default {
    customId: COOLDOWN_PAGINATION_CUSTOM_IDS.prev,
    dynamic: true,
    deferUpdate: true,
    execute,
} satisfies Button;

export const nextHandler = {
    customId: COOLDOWN_PAGINATION_CUSTOM_IDS.next,
    dynamic: true,
    deferUpdate: true,
    execute,
} satisfies Button;