
import 'dotenv/config';
import { rootLogger } from './logger/base';

const logger = rootLogger.getSubLogger({ name: 'env' });

const REQUIRED = 'required' as const;

function optional<T extends string>(fallback: T) {
    return { __optional: true, fallback } as const;
}

type FieldSpec = typeof REQUIRED | ReturnType<typeof optional>;

const SCHEMA = {
    DISCORD_BOT_TOKEN: { spec: REQUIRED, sensitive: true },
    DISCORD_BOT_CLIENT: { spec: REQUIRED, sensitive: false },
    DEVELOPER_ID: { spec: REQUIRED, sensitive: false },
    PREFIX: { spec: REQUIRED, sensitive: false },
    DISCORD_GUILD: { spec: optional(''), sensitive: false },
    DATABASE_URL: { spec: REQUIRED, sensitive: true },
    WEBHOOK_URL: { spec: REQUIRED, sensitive: true }
} satisfies Record<string, { spec: FieldSpec; sensitive: boolean }>;

type SchemaKey = keyof typeof SCHEMA;

function buildEnv(): Record<SchemaKey, string> {
    logger.trace({ keys: Object.keys(SCHEMA) }, 'Validating environment');

    const resolved = {} as Record<SchemaKey, string>;
    const missing: SchemaKey[] = [];

    for (const [key, { spec, sensitive }] of Object.entries(SCHEMA) as [SchemaKey, { spec: FieldSpec; sensitive: boolean }][]) {
        const raw = process.env[key]?.trim() ?? '';

        if (raw) {
            resolved[key] = raw;
            logger.trace({ key, value: sensitive ? '[REDACTED]' : raw }, `Resolved: ${key}`);
            continue;
        }

        if (spec === REQUIRED) {
            missing.push(key);
        } else {
            resolved[key] = spec.fallback;
            logger.trace({ key, fallback: sensitive ? '[REDACTED]' : spec.fallback || '(empty)' }, `Optional fallback: ${key}`);
        }
    }

    if (missing.length > 0) {
        logger.fatal({ missing }, `Missing ${missing.length} required environment variable(s)`);
        process.exit(1);
    }

    logger.info({
        CLIENT_ID: resolved.DISCORD_BOT_CLIENT,
        GUILD_ID: resolved.DISCORD_GUILD || '(not set)',
        DEVELOPER: resolved.DEVELOPER_ID,
        PREFIX: resolved.PREFIX,
        DATABASE_URL: resolved.DATABASE_URL,
        WEBHOOK_URL: resolved.WEBHOOK_URL
    }, 'Environment validated ✅');

    return resolved;
}

const _env = buildEnv();

export const env = {
    get TOKEN() { return _env.DISCORD_BOT_TOKEN; },
    get CLIENT_ID() { return _env.DISCORD_BOT_CLIENT; },
    get DEVELOPER() { return _env.DEVELOPER_ID; },
    get PREFIX() { return _env.PREFIX; },
    get GUILD_ID() { return _env.DISCORD_GUILD; },
    get DATABASE_URL() { return _env.DATABASE_URL },
    get WEBHOOK_URL() { return _env.WEBHOOK_URL }
} as const;

export type Env = typeof env;