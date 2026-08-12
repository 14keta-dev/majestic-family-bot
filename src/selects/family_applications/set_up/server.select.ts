import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { SelectMenu } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";
import { getDraft, setDraftField } from "../../../utils/family_applications/setupDraftStore";
import { build_set_up_family_applications_embed, SETUP_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../embed/family_applications/set_up.embed";
import { Majestic_Servers } from "../../../utils/emojis/server_emoji_map";

export default {
    customId: SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.server,
    async execute(interaction: AnySelectMenuInteraction) {
        if (!interaction.isStringSelectMenu()) return;
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

        const meta = metaBuilder(interaction.member, { select: "family_applications_setup_server" });

        try {
            const selected = interaction.values[0];
            if (!Object.values(Majestic_Servers).includes(selected as Majestic_Servers)) {
                log.command.error(meta, `Unexpected server value from select menu: "${selected}"`);
                await interaction.reply({ content: "Некорректный выбор сервера.", flags: MessageFlags.Ephemeral });
                return;
            }

            const updated = setDraftField(interaction.message.id, "server", selected as Majestic_Servers);

            log.command.info(meta, "Updated family applications setup draft: server");
            await interaction.update({
                components: build_set_up_family_applications_embed(updated),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.command.error(meta, "Failed to update family applications setup draft (server)");
            await safeReply(interaction, error, "family_applications_setup.server", interaction.id);
        }
    },
} satisfies SelectMenu;