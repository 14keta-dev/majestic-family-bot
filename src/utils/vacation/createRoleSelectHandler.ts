import { AnySelectMenuInteraction, GuildMember, MessageFlags } from "discord.js";
import { SelectMenu } from "../../types";
import { metaBuilder } from "../logger/met_builder";
import { safeReply } from "../safeReply.helper";
import { log } from "../logger";
import { setVacationDraftField } from "./draft_store";
import { build_set_up_vacation_embed } from "../../embed/vacation/set_up.embed";
import { passesVacationSetupGuards } from "../../selects/vacation/set_up/selectGuards.helper";

export function createVacationRoleSelectHandler(customId: string): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {
            if (!interaction.isRoleSelectMenu()) return;
            if (!(await passesVacationSetupGuards(interaction))) return;

            const meta = metaBuilder(interaction.member as GuildMember, { select: "vacation_setup_vacation_role" });

            try {
                const roleId = interaction.values[0];
                const updated = setVacationDraftField(interaction.message.id, "vacation_role", roleId);

                log.command.info(meta, "Updated vacation setup draft: vacation_role");
                await interaction.update({
                    components: build_set_up_vacation_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, "Failed to update vacation setup draft (vacation_role)");
                await safeReply(interaction, error, "vacation_setup.vacation_role", interaction.id);
            }
        },
    };
}

export function createVacationPingRoleSelectHandler(customId: string): SelectMenu {
    return {
        customId,
        async execute(interaction: AnySelectMenuInteraction) {
            if (!interaction.isRoleSelectMenu()) return;
            if (!(await passesVacationSetupGuards(interaction))) return;

            const meta = metaBuilder(interaction.member as GuildMember, { select: "vacation_setup_ping_role" });

            try {
                const roleIds = interaction.values;
                const updated = setVacationDraftField(interaction.message.id, "ping_role", roleIds);

                log.command.info(meta, "Updated vacation setup draft: ping_role");
                await interaction.update({
                    components: build_set_up_vacation_embed(updated),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, "Failed to update vacation setup draft (ping_role)");
                await safeReply(interaction, error, "vacation_setup.ping_role", interaction.id);
            }
        },
    };
}