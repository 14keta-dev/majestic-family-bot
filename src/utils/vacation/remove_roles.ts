import { GuildMember } from "discord.js";
import { log } from "../logger";
import { metaBuilder } from "../logger/met_builder";
import { VacationRoleError } from "./errors";

export const vacation_role_service = {
    async apply(member: GuildMember, vacationId: string, vacationRoleId: string): Promise<string[]> {
        const guild = member.guild;
        const me = guild.members.me ?? (await guild.members.fetchMe());

        if (!me.permissions.has("ManageRoles")) {
            throw new VacationRoleError("Bot is missing the Manage Roles permission");
        }

        const vacationRole = guild.roles.cache.get(vacationRoleId);
        if (!vacationRole) {
            throw new VacationRoleError(`Vacation role ${vacationRoleId} not found in guild`);
        }
        if (!vacationRole.editable) {
            throw new VacationRoleError(`Bot cannot assign vacation role ${vacationRoleId} (hierarchy/permissions)`);
        }

        const removable = member.roles.cache.filter(
            (role) => role.id !== guild.id && role.id !== vacationRoleId && !role.managed && role.editable,
        );
        const removedIds = [...removable.keys()];

        try {
            if (removable.size > 0) {
                await member.roles.remove(removable, `Отпуск (${vacationId})`);
            }
            if (!member.roles.cache.has(vacationRoleId)) {
                await member.roles.add(vacationRoleId, `Отпуск (${vacationId})`);
            }
        } catch (error) {
            if (removedIds.length > 0) {

                await member.roles
                    .add(removedIds, `Rollback: ошибка оформления отпуска (${vacationId})`)
                    .catch((rollbackError) => {
                        log.modal.error(
                            metaBuilder(member, { modal: "vacation_role_service.apply" }),
                            `CRITICAL: role rollback also failed after apply() failure (vacation ${vacationId}) — member may have lost roles with no vacation role assigned`,
                            rollbackError,
                        );
                    });
            }
            throw new VacationRoleError("Failed to apply vacation roles", error);
        }

        return removedIds;
    },


    async restore(
        member: GuildMember,
        removedRoleIds: string[],
        vacationRoleId: string,
        vacationId: string,
    ): Promise<boolean> {
        try {
            if (member.roles.cache.has(vacationRoleId)) {
                await member.roles.remove(vacationRoleId, `Rollback: отпуск отменён (${vacationId})`);
            }
            if (removedRoleIds.length > 0) {
                await member.roles.add(removedRoleIds, `Rollback: отпуск отменён (${vacationId})`);
            }
            return true;
        } catch (error) {
            log.modal.error(
                metaBuilder(member, { modal: "vacation_role_service.restore" }),
                `Failed to restore roles after vacation rollback (vacation ${vacationId})`,
                error,
            );
            return false;
        }
    },
};