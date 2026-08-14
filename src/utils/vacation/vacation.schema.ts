import { nanoid } from "nanoid";
import { JsonDb } from "../db/local/local_db";
import { getConfig } from "../config/store";

export interface Vacation_schema {
    id: string;
    userId: string;
    reason: string;
    estimated_end: string;
    status: null | "REJECTED" | "APPROVED";
    reject_reason: string | null;
    reviewerId: string | null;
    endedAt: string | null;
    roles_romeved: string[];
    log_message: string | null;
    startedAt: string;
}

export class Already_on_vacation_error extends Error {
    constructor(public readonly userId: string, public readonly existingId: string) {
        super(`Пользователь ${userId} уже имеет активный отпуск (${existingId})`);
        this.name = "AlreadyOnVacationError";
    }
}

export class Invalid_vacation_date_error extends Error {
    constructor(public readonly input: string) {
        super(`Неверный формат даты: "${input}". Используйте формат ДД.ММ, например 25.02`);
        this.name = "InvalidVacationDateError";
    }
}

export class Invalid_vacation_duration_error extends Error {
    constructor(public readonly durationDays: number) {
        super(
            durationDays < MIN_VACATION_DURATION
                ? `Отпуск слишком короткий: ${durationDays} дн. (минимум ${MIN_VACATION_DURATION})`
                : `Отпуск слишком длинный: ${durationDays} дн. (максимум ${MAX_VACATION_DURATION})`,
        );
        this.name = "InvalidVacationDurationError";
    }
}

export function formatDateDDMMYYYY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

export function formatDateTimeDDMMYYYY(date: Date): string {
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${formatDateDDMMYYYY(date)} ${hh}:${min}`;
}

export function formatVacationDuration(estimatedEndIso: string, now: Date = new Date()): string {
    const endDate = new Date(estimatedEndIso);
    const msPerDay = 24 * 60 * 60 * 1000;
    const durationDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / msPerDay));
    return `${durationDays} дн. | ${formatDateDDMMYYYY(endDate)}`;
}

const vacation_db = new JsonDb<Vacation_schema>("vacation-db");

const MIN_VACATION_DURATION = 1;
const MAX_VACATION_DURATION = 31;

export function parseEstimatedEndDate(input: string, now: Date = new Date()): Date | null {
    const match = input.trim().match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) return null;

    const daysInMonth = new Date(now.getFullYear(), month, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;

    let year = now.getFullYear();
    let candidate = new Date(year, month - 1, day, 23, 59, 59, 999);

    if (candidate.getTime() <= now.getTime()) {
        year += 1;
        const daysInMonthNextYear = new Date(year, month, 0).getDate();
        if (day > daysInMonthNextYear) return null;
        candidate = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    return candidate;
}

export function validateVacationDuration(
    estimatedEnd: Date,
    now: Date = new Date(),
): { ok: true; durationDays: number } | { ok: false; durationDays: number } {
    const msPerDay = 24 * 60 * 60 * 1000;
    const durationDays = Math.ceil((estimatedEnd.getTime() - now.getTime()) / msPerDay);

    return {
        ok: durationDays >= MIN_VACATION_DURATION && durationDays <= MAX_VACATION_DURATION,
        durationDays,
    };
}

function isActive(v: Vacation_schema, nowIso: string): boolean {
    return v.status !== "REJECTED" && v.endedAt === null && v.estimated_end > nowIso;
}

function isTrulyActive(v: Vacation_schema, nowIso: string, controlled: boolean): boolean {
    if (v.endedAt !== null) return false;
    if (v.estimated_end <= nowIso) return false;
    if (v.status === "REJECTED") return false;
    if (controlled && v.status !== "APPROVED") return false;
    return true;
}

export function findActiveVacation(userId: string, now: Date = new Date()): Vacation_schema | null {
    const nowIso = now.toISOString();
    return vacation_db.find((r) => r.userId === userId && isActive(r, nowIso)) ?? null;
}

export function listActiveVacations(now: Date = new Date()): Vacation_schema[] {
    const nowIso = now.toISOString();
    const controlled = getConfig().vacation.controlled;
    return vacation_db.getAll().filter((v) => isTrulyActive(v, nowIso, controlled));
}

const pendingVacationLocks = new Set<string>();

export class Vacation_write_in_progress_error extends Error {
    constructor(public readonly userId: string) {
        super("Заявка уже обрабатывается, подождите секунду и попробуйте снова.");
        this.name = "VacationWriteInProgressError";
    }
}

const vacationEntryLocks = new Set<string>();

export class Vacation_entry_locked_error extends Error {
    constructor(public readonly entryId: string) {
        super("Эта заявка уже обрабатывается, подождите секунду и попробуйте снова.");
        this.name = "VacationEntryLockedError";
    }
}

export function acquireVacationEntryLock(entryId: string): void {
    if (vacationEntryLocks.has(entryId)) {
        throw new Vacation_entry_locked_error(entryId);
    }
    vacationEntryLocks.add(entryId);
}

export function releaseVacationEntryLock(entryId: string): void {
    vacationEntryLocks.delete(entryId);
}

export const vacation_store = {
    get: (id: string) => vacation_db.get(id),
    getAll: () => vacation_db.getAll(),

    async enter_vacation(data: {
        userId: string;
        reason: string;
        estimated_end_input: string;
        roles_romeved: string[];
        log_message: string;
    }): Promise<Vacation_schema> {
        if (pendingVacationLocks.has(data.userId)) {
            throw new Vacation_write_in_progress_error(data.userId);
        }
        pendingVacationLocks.add(data.userId);

        try {
            const now = new Date();

            const estimatedEndDate = parseEstimatedEndDate(data.estimated_end_input, now);
            if (!estimatedEndDate) {
                throw new Invalid_vacation_date_error(data.estimated_end_input);
            }

            const duration = validateVacationDuration(estimatedEndDate, now);
            if (!duration.ok) {
                throw new Invalid_vacation_duration_error(duration.durationDays);
            }

            const existing = findActiveVacation(data.userId, now);
            if (existing) {
                throw new Already_on_vacation_error(data.userId, existing.id);
            }

            const entry: Vacation_schema = {
                id: nanoid(),
                userId: data.userId,
                reason: data.reason,
                estimated_end: estimatedEndDate.toISOString(),
                status: null,
                startedAt: now.toISOString(),
                reject_reason: null,
                reviewerId: null,
                endedAt: null,
                roles_romeved: data.roles_romeved,
                log_message: data.log_message,
            };

            await vacation_db.set(entry);

            return entry;
        } finally {
            pendingVacationLocks.delete(data.userId);
        }
    },

    async update_vacation(id: string, patch: Partial<Vacation_schema>): Promise<Vacation_schema | null> {
        const current = vacation_db.get(id);
        if (!current) return null;

        const updated: Vacation_schema = { ...current, ...patch };
        await vacation_db.set(updated);

        return updated;
    },

    async delete_vacation(id: string) {
        const vacation = vacation_db.get(id);
        if (!vacation) return null;

        await vacation_db.delete(id);
    },
};