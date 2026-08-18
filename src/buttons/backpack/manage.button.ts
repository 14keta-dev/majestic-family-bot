import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../../embed/commands/menu.embed";
import { Button } from "../../types";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { are_backpack_channels_configured } from "../../utils/backpack/is_configured";
import { initBackpackDraft } from "../../utils/backpack/draft";
import { build_set_up_backpack_embed } from "../../embed/bacpack/set_up.embed";
import { manage_backpack_embed } from "../../embed/bacpack/manage.embed";
import { safeReply } from "../../utils/safeReply.helper";
import { log } from "../../utils/logger";
import { backpack_store } from "../../utils/backpack/backpack.schema";
import { get_backpack_family_status } from "../../utils/backpack/get_missing_backpack_members";

export default {
    customId: MANAGE_MENU_CUSTOM_ID.backpack,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_backpack" });

        try {
            const config = getConfig();
            const backpacks = backpack_store.get_all_channels();

            if (!are_backpack_channels_configured(config.backpack)) {
                const draft = initBackpackDraft(interaction.message.id, interaction.user.id);
                await interaction.editReply({
                    components: build_set_up_backpack_embed(draft),
                    flags: MessageFlags.IsComponentsV2,
                });
                return;
            }

            const { familyMembers, missingMembers } = await get_backpack_family_status(interaction.guild, config);

            await interaction.editReply({
                components: manage_backpack_embed({
                    backpack_config: config.backpack,
                    backpacks,
                    familyMemberCount: familyMembers.length,
                    missingBackpackCount: missingMembers.length,
                }),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send backpack manage panel");
            await safeReply(interaction, error, "manage_backpack.execute", interaction.id);
        }
    },
} satisfies Button;