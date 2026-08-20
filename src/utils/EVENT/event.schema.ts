
import { JsonDb } from "../db/local/local_db";
import { parseFlexibleDateTime } from "./format_date";

export interface EventSchema {
    type: string;

    id: string;
    createdBy: string;
    description: string;
    maxParticipants: number;
    startTime: string;

    mainListParticipant: string[];
    replacementListParticinapnt: string[];
    replaysSubmitted: EventReplayShcema[];

    messageId: string;
    archiveMessage: string;
    registrationOpen: boolean;

    threadId: string;

    archiveThreadId: string;

    createdAt: string;
    endedAt: string;
}

interface EventReplayShcema {
    user: string;
    link: string;
}

export type EventListMutationResult =
    | { status: "added"; event: EventSchema }
    | { status: "already_in_list"; event: EventSchema }
    | { status: "full"; event: EventSchema }
    | { status: "in_main_list"; event: EventSchema }
    | { status: "not_found" };

export type EventRemovalResult =
    | { status: "removed"; event: EventSchema }
    | { status: "not_in_list"; event: EventSchema }
    | { status: "not_found" };

export type EventReplaySubmissionResult =
    | { status: "submitted"; event: EventSchema }
    | { status: "updated"; event: EventSchema }
    | { status: "not_found" };


type ImmutableEventFields = "id" | "threadId";
export type MpUpdatePayload = Partial<Omit<EventSchema, ImmutableEventFields>>;

export const eventDB = new JsonDb<EventSchema>("event_db");


const locks = new Map<string, Promise<unknown>>();

function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const prior = locks.get(id) ?? Promise.resolve();
    const run = prior.then(fn, fn);
    locks.set(id, run.catch(() => undefined));
    return run;
}

const threadIndex = new Map<string, string>();
let threadIndexBuilt = false;

function ensureThreadIndex(): void {
    if (threadIndexBuilt) return;

    for (const entry of eventDB.getAll()) {
        threadIndex.set(entry.threadId, entry.id);
    }

    threadIndexBuilt = true;
}

export const event_store = {
    get: (id: string) => eventDB.get(id),

    get_by_thread: (threadId: string) => {
        ensureThreadIndex();

        const id = threadIndex.get(threadId);
        if (!id) return undefined;

        const event = eventDB.get(id);
        if (!event) {
            threadIndex.delete(threadId);
            return undefined;
        }

        return event;
    },

    async create_event(data: {
        id: string;
        type: string;
        createdBy: string;
        description: string;
        maxParticipants: string;
        startTime: string;
        messageId: string;
        threadId: string;
    }): Promise<EventSchema> {

        const maxParticipants = Number(data.maxParticipants);
        if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
            throw new Error(`create_event: invalid maxParticipants "${data.maxParticipants}"`);
        }

        if (!data.description.trim()) {
            throw new Error("create_event: description cannot be empty");
        }

        const start_time = parseFlexibleDateTime(data.startTime);
        const now = new Date().toISOString();

        const entry: EventSchema = {
            id: data.id,
            type: data.type,
            createdBy: data.createdBy,
            description: data.description,
            maxParticipants,
            startTime: start_time,
            mainListParticipant: [],
            replacementListParticinapnt: [],
            replaysSubmitted: [],
            messageId: data.messageId,
            archiveMessage: "",
            archiveThreadId: "",
            createdAt: now,
            endedAt: "",
            registrationOpen: true,
            threadId: data.threadId,
        };

        await eventDB.set(entry);

        ensureThreadIndex();
        threadIndex.set(entry.threadId, entry.id);

        return entry;
    },

    async add_to_main(id: string, userId: string): Promise<EventListMutationResult> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return { status: "not_found" };

            const mainlist = event.mainListParticipant ?? [];
            if (mainlist.includes(userId)) return { status: "already_in_list", event };
            if (mainlist.length >= event.maxParticipants) return { status: "full", event };

            const updatedMain = [...mainlist, userId];
            const updatedReplacement = (event.replacementListParticinapnt ?? []).filter((u) => u !== userId);

            const updated = await eventDB.update(id, {
                mainListParticipant: updatedMain,
                replacementListParticinapnt: updatedReplacement,
            });

            if (!updated) return { status: "not_found" };
            return { status: "added", event: updated };
        });
    },

    async add_to_replacement(id: string, userId: string): Promise<EventListMutationResult> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return { status: "not_found" };

            if ((event.mainListParticipant ?? []).includes(userId)) {
                return { status: "in_main_list", event };
            }

            const replacement = event.replacementListParticinapnt ?? [];
            if (replacement.includes(userId)) return { status: "already_in_list", event };

            const updatedReplacement = [...replacement, userId];

            const updated = await eventDB.update(id, {
                replacementListParticinapnt: updatedReplacement,
            });

            if (!updated) return { status: "not_found" };
            return { status: "added", event: updated };
        });
    },

    async remove_participant(id: string, userId: string): Promise<EventSchema | null> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return null;

            const updatedMain = (event.mainListParticipant ?? []).filter((u) => u !== userId);
            const updatedReplacement = (event.replacementListParticinapnt ?? []).filter((u) => u !== userId);

            return eventDB.update(id, {
                mainListParticipant: updatedMain,
                replacementListParticinapnt: updatedReplacement,
            });
        });
    },

    async remove_from_main(id: string, userId: string): Promise<EventRemovalResult> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return { status: "not_found" };

            if (!(event.mainListParticipant ?? []).includes(userId)) {
                return { status: "not_in_list", event };
            }

            const updated = await eventDB.update(id, {
                mainListParticipant: (event.mainListParticipant ?? []).filter((u) => u !== userId),
            });

            if (!updated) return { status: "not_found" };
            return { status: "removed", event: updated };
        });
    },

    async remove_from_replacement(id: string, userId: string): Promise<EventRemovalResult> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return { status: "not_found" };

            if (!(event.replacementListParticinapnt ?? []).includes(userId)) {
                return { status: "not_in_list", event };
            }

            const updated = await eventDB.update(id, {
                replacementListParticinapnt: (event.replacementListParticinapnt ?? []).filter((u) => u !== userId),
            });

            if (!updated) return { status: "not_found" };
            return { status: "removed", event: updated };
        });
    },

    async updateLocked(id: string, partial: MpUpdatePayload): Promise<EventSchema | null> {
        return withLock(id, async () => {
            if (!eventDB.get(id)) return null;
            return eventDB.update(id, partial);
        });
    },

    async submit_replay(id: string, userId: string, link: string): Promise<EventReplaySubmissionResult> {
        return withLock(id, async () => {
            const event = eventDB.get(id);
            if (!event) return { status: "not_found" };

            const existing = event.replaysSubmitted ?? [];
            const existingIndex = existing.findIndex((r) => r.user === userId);

            let updatedReplays: EventReplayShcema[];
            let status: "submitted" | "updated";

            if (existingIndex !== -1) {
                updatedReplays = existing.map((r, i) =>
                    i === existingIndex ? { user: userId, link } : r
                );
                status = "updated";
            } else {
                updatedReplays = [...existing, { user: userId, link }];
                status = "submitted";
            }

            const updated = await eventDB.update(id, {
                replaysSubmitted: updatedReplays,
            });

            if (!updated) return { status: "not_found" };
            return { status, event: updated };
        });
    },
};