import { AnySelectMenuInteraction, GuildMember, MessageFlags } from "discord.js";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";
import { setBackpackDraftField } from "./draft";
import { build_set_up_backpack_embed } from "../../embed/bacpack/set_up.embed";

export function createBackpackAllowedRolesRoleSelectHandler(customId: string): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {
            if (!interaction.isRoleSelectMenu()) return;

            const meta = metaBuilder(interaction.member as GuildMember, { select: "backpack_setup_allowed_roles" });

            try {
                const roleIds = interaction.values;
                const updated = setBackpackDraftField(interaction.message.id, "allowed_roles", roleIds);

                log.command.info(meta, "Updated backpack setup draft: allowed_roles");
                await interaction.update({
                    components: build_set_up_backpack_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, "Failed to update backpack setup draft (allowed_roles)");
                await safeReply(interaction, error, "backpack_setup.allowed_roles", interaction.id);
            }
        },
    };
}