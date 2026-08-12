import { GuildMember, PermissionsBitField } from "discord.js";
import { getApplyType } from "../config/family_applications/applyFieldPresets";
import { getConfig } from "../config/store";

export interface CanReviewApplicationParams {
    member: GuildMember;
    application_kind: string;
    takenByUserId?: string;
}

/**
 * Who can interact with a given application, in priority order:
 *
 * 1. Admins (ManageGuild) — always, regardless of claim state.
 * 2. Priority roles (config.priority_roles) — always, even on an
 *    application already claimed by a pingRole reviewer. This is the
 *    override: priority roles outrank a pingRole claim.
 * 3. Whoever currently holds the application — the claim itself is
 *    always sufficient to keep acting on what you took.
 * 4. pingRole holders — only while the application is unclaimed. Once
 *    someone takes it, other pingRole members lose access; only the
 *    taker (case 3), a priority role (case 2), or an admin (case 1)
 *    can act on it from that point on.
 *
 * Anyone not covered by the above (e.g. a pingRole member on an
 * application someone else already took) is denied.
 */
export default async function can_review_application({
    member,
    application_kind,
    takenByUserId,
}: CanReviewApplicationParams): Promise<boolean> {
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return true;
    }

    const applyType = getApplyType(application_kind);
    if (!applyType) {
        // Unknown/removed apply type — nothing to check roles against, so
        // deny rather than silently letting anyone through.
        return false;
    }

    const { priority_roles } = getConfig().family_applications;

    const isPriorityRole = priority_roles.some((roleId) => member.roles.cache.has(roleId));
    if (isPriorityRole) {
        return true;
    }

    const isTaken = !!takenByUserId;

    if (isTaken) {
        // Taken: only the person who took it (already covered above by
        // priority/admin, or here directly) still has access.
        return member.id === takenByUserId;
    }

    // Not taken yet: pingRole holders can act (take/accept/reject/etc.).
    return member.roles.cache.has(applyType.pingRole);
}