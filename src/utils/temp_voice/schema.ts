import { JsonDb } from "../db/local/local_db";

export interface Temp_voice_schema {
    id: string;
    ownerId: string;
    createdAt: string;
};

const temp_voice_db = new JsonDb<Temp_voice_schema>("temp_voice");

export const temp_voice_store = {
    get: (id: string) => temp_voice_db.get(id),

    async create_voice(data: {
        id: string,
        ownerId: string,
    }): Promise<Temp_voice_schema> {
        const now = new Date().toISOString();

        const entry: Temp_voice_schema = {
            id: data.id,
            ownerId: data.ownerId,
            createdAt: now
        };

        await temp_voice_db.set(entry);
        return entry;
    },
    async delete_voice(data: {
        id: string;
    }): Promise<Temp_voice_schema | null> {
        const entry = await temp_voice_db.get(data.id);

        if (!entry) return null;

        await temp_voice_db.delete(data.id);
        return entry;
    },
    async update_owner(data: {
        id: string;
        newOwnerId: string;
    }): Promise<Temp_voice_schema | null> {
        const entry = await temp_voice_db.get(data.id);

        if (!entry) return null;

        const updated: Temp_voice_schema = {
            ...entry,
            ownerId: data.newOwnerId,
        };

        await temp_voice_db.set(updated);
        return updated;
    }
}