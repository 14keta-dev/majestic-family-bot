// src/utils/db/jsonDb.ts
import fs from "fs";
import path from "path";
import { log } from "../../logger";

const DB_DIR = path.resolve(process.cwd(), "db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

export class JsonDb<T extends { id: string }> {
    private readonly filePath: string;
    private readonly tmpPath: string;
    private readonly dbName: string;


    private cache: Map<string, T> | null = null;

    private writeQueue: Promise<void> = Promise.resolve();

    constructor(name: string) {
        this.filePath = path.join(DB_DIR, `${name}.json`);
        this.tmpPath = path.join(DB_DIR, `${name}.tmp`);
        this.dbName = name;
    }

    private getCache(): Map<string, T> {
        if (this.cache !== null) return this.cache;

        try {
            if (!fs.existsSync(this.filePath)) {
                return (this.cache = new Map());
            }
            const raw = fs.readFileSync(this.filePath, "utf-8").trim();
            if (!raw) return (this.cache = new Map());
            const entries = JSON.parse(raw) as T[];
            return (this.cache = new Map(entries.map((e) => [e.id, e])));
        } catch (err) {
            log.db.error({ db: this.dbName, file: this.filePath, err }, "Failed to read db — starting empty");
            return (this.cache = new Map());
        }
    }


    private async flushToDisk(store: Map<string, T>): Promise<void> {
        const data = JSON.stringify([...store.values()], null, 2);
        await fs.promises.writeFile(this.tmpPath, data, "utf-8");
        await fs.promises.rename(this.tmpPath, this.filePath);
    }

    private enqueue(mutate: (store: Map<string, T>) => void): Promise<void> {
        const store = this.getCache();
        mutate(store);

        const thisWrite = this.writeQueue.then(() => this.flushToDisk(store));

        this.writeQueue = thisWrite.catch((err) => {
            log.db.error({ db: this.dbName, err }, "Queued write failed — continuing queue for subsequent writes");
        });

        return thisWrite;
    }


    get(id: string): T | undefined {
        return this.getCache().get(id);
    }

    getAll(): T[] {
        return [...this.getCache().values()];
    }

    has(id: string): boolean {
        return this.getCache().has(id);
    }

    find(predicate: (entry: T) => boolean): T | undefined {
        return this.getAll().find(predicate);
    }

    filter(predicate: (entry: T) => boolean): T[] {
        return this.getAll().filter(predicate);
    }

    query<K extends keyof T>(where: Partial<Record<K, T[K]>>): T[] {
        return this.getAll().filter((entry) =>
            (Object.entries(where) as [K, T[K]][]).every(([k, v]) => entry[k] === v),
        );
    }

    queryContains<K extends keyof T>(
        field: K,
        value: T[K] extends (infer I)[] ? I : never,
    ): T[] {
        return this.getAll().filter((entry) => {
            const arr = entry[field];
            return Array.isArray(arr) && arr.includes(value);
        });
    }


    async set(entry: T): Promise<void> {
        return this.enqueue((store) => {
            store.set(entry.id, entry);
        });
    }

    async update(id: string, partial: Partial<Omit<T, "id">>): Promise<T | null> {
        const existing = this.getCache().get(id);
        if (!existing) return null;

        const updated = { ...existing, ...partial };
        await this.enqueue((store) => {
            store.set(id, updated);
        });
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        if (!this.getCache().has(id)) return false;

        await this.enqueue((store) => {
            store.delete(id);
        });
        return true;
    }
}