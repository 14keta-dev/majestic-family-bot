import { nanoid } from "nanoid";
import { JsonDb } from "../db/local/local_db";

export interface AFK_schema {
    //random id generated nanoid, primary id
    id: string;
    //discord snowflake of user that entered
    userId: string;
    //reason why user entered afk
    afk_reason: string;
    //timestamp when user entered
    enteredAt: string;
    //estimated time user will be left
    estimatedEndingAt: string;
    //actull time user left afk
    leftAt: string | null;
    //message id in the log channel
    log_message: string;
    //actuall end time of afk
    endedAt: string | null;
    //if user got kicked 
    kicked_by_id: string | null;
    //kick reason
    kick_reason: string | null
    //mesage that replayins to initial message with leave data
    leave_message: string | null;
};

export class Already_in_afk_error extends Error {
    constructor(public readonly userId: string, public readonly existingId: string) {
        super(`User ${userId} already has an active afk (${existingId})`);
        this.name = "AlreadyActiveAFKError";
    }
};

export class Invalid_afk_duration extends Error {
    constructor(public readonly raw: string, reason?: string) {
        super(`Не верный формат: ${raw}${reason ? ` (${reason})` : ""}`);
        this.name = "InvalidAFKDurationError";
    }
};

export class Not_in_afk_error extends Error {
    constructor(public readonly userId: string) {
        super(`User ${userId} has no active afk`);
        this.name = "NotInAFKError";
    }
}

const afk_db = new JsonDb<AFK_schema>("afk-db");


const DURATION_PATTERN = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*$/i;

const MIN_AFK_MINUTES = 30;
const MAX_AFK_MINUTES = 24 * 60; 

export function parseAfkDurationMinutes(raw: string): number {
    const match = DURATION_PATTERN.exec(raw);

    if (!match || (match[1] === undefined && match[2] === undefined)) {
        throw new Invalid_afk_duration(raw, "формат должен быть например 30m, 1h или 1h30m");
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes === 0) {
        throw new Invalid_afk_duration(raw, "длительность не может быть нулевой");
    }

    if (totalMinutes < MIN_AFK_MINUTES) {
        throw new Invalid_afk_duration(raw, `минимум ${MIN_AFK_MINUTES}m`);
    }

    if (totalMinutes > MAX_AFK_MINUTES) {
        throw new Invalid_afk_duration(raw, `максимум ${MAX_AFK_MINUTES}m (24h)`);
    }

    return totalMinutes;
}

function isActive(v: AFK_schema, nowIso: string): boolean {
    return v.endedAt === null && v.estimatedEndingAt > nowIso;
};

function isExpired(v: AFK_schema, nowIso: string): boolean {
    return v.endedAt === null && v.estimatedEndingAt <= nowIso;
}

export const afk_store = {
    get: (id: string) => afk_db.get(id),
    getAll: () => afk_db.getAll(),
    get_by_user: (userId: string) => afk_db.find((r) => r.userId === userId),
    get_all_afk: (): AFK_schema[] => {
        const now = new Date().toISOString();
        return afk_db.filter((r) => isActive(r, now))
    },

    async enter_afk(data: {
        userId: string;
        reason: string;
        duration: string;
        messageId: string;
    }): Promise<AFK_schema> {
        const now = new Date().toISOString();

        const existing = afk_db.find((r) => r.userId === data.userId && isActive(r, now));
        if (existing) {
            throw new Already_in_afk_error(data.userId, existing.id);
        }

        const durationMinutes = parseAfkDurationMinutes(data.duration);
        const enteredAt = new Date();
        const estimatedEndingAt = new Date(enteredAt.getTime() + durationMinutes * 60_000);

        const entry: AFK_schema = {
            id: nanoid(),
            userId: data.userId,
            afk_reason: data.reason,
            enteredAt: enteredAt.toISOString(),
            estimatedEndingAt: estimatedEndingAt.toISOString(),
            leftAt: null,
            log_message: data.messageId,
            endedAt: null,
            kicked_by_id: null,
            kick_reason: null,
            leave_message: null,
        };

        await afk_db.set(entry);
        return entry;
    },

    async kick(userId: string, kickedById: string, reason: string, leave_message: string): Promise<AFK_schema> {
        const now = new Date().toISOString();
        const active = afk_db.find((r) => r.userId === userId && isActive(r, now));

        if (!active) {
            throw new Not_in_afk_error(userId);
        }

        const updated = await afk_db.update(active.id, {
            endedAt: now,
            kicked_by_id: kickedById,
            kick_reason: reason,
            leave_message: leave_message
        });

        if (!updated) {
            throw new Not_in_afk_error(userId);
        }

        return updated;
    },
    async leave(userId: string, leave_message: string): Promise<AFK_schema> {
        const now = new Date().toISOString();
        const active = afk_db.find((r) => r.userId === userId && isActive(r, now));

        if (!active) {
            throw new Not_in_afk_error(userId);
        }

        const updated = await afk_db.update(active.id, {
            endedAt: now,
            leftAt: now,
            leave_message,
        });

        if (!updated) {
            throw new Not_in_afk_error(userId);
        }

        return updated;
    },
    get_all_expired: (): AFK_schema[] => {
        const now = new Date().toISOString();
        return afk_db.filter((r) => isExpired(r, now));
    },
    async setLeaveMessage(id: string, leave_message: string): Promise<AFK_schema | null> {
        return afk_db.update(id, { leave_message });
    },
}