import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as tables from "./schema/index";
import { log } from "../logger";

const dblog = log.db;

const POOL_CONFIG = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 1800,
} as const;

function redactUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.password) parsed.password = "[REDACTED]";
        if (parsed.username) parsed.username = "[REDACTED]";
        return parsed.toString();
    } catch {
        return "[unparseable URL]";
    }
}

dblog.trace("Creating postgres client", {
    meta: { url: redactUrl(env.DATABASE_URL), pool: POOL_CONFIG },
});

let client: ReturnType<typeof postgres>;

try {
    client = postgres(env.DATABASE_URL, {
        ...POOL_CONFIG,
        prepare: false,
        onnotice: (notice) => {
            dblog.debug("Postgres notice", {
                meta: { severity: notice.severity, message: notice.message },
            });
        },
    });
} catch (err) {
    dblog.fatal("Failed to create postgres client", {
        error: err,
        meta: { url: redactUrl(env.DATABASE_URL) },
    });
    process.exit(1);
}

dblog.debug("Postgres client created", {
    meta: { url: redactUrl(env.DATABASE_URL), pool: POOL_CONFIG },
});

dblog.trace("Initialising Drizzle ORM");

let db: ReturnType<typeof drizzle<typeof tables>>;

try {
    db = drizzle(client, { schema: tables });
} catch (err) {
    dblog.fatal("Failed to initialise Drizzle ORM", { error: err });
    process.exit(1);
}

dblog.debug("Drizzle ORM initialised");

async function probeConnection(): Promise<void> {
    dblog.trace("Probing database connectivity");
    try {
        await client`SELECT 1`;
        dblog.info("Database connection established", {
            meta: { url: redactUrl(env.DATABASE_URL), pool: POOL_CONFIG },
        });
    } catch (err) {
        dblog.fatal("Database connectivity probe failed — cannot start", {
            error: err,
            meta: { url: redactUrl(env.DATABASE_URL) },
        });
        process.exit(1);
    }
}

export const dbReady: Promise<void> = probeConnection();

export { db, client };