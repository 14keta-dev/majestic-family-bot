import 'dotenv/config';
import { rootLogger } from './logger/base';

const logger = rootLogger.getSubLogger({ name: 'env' });

const REQUIRED = 'required' as const;

function optional<T extends string>(fallback: T) {
    return { __optional: true, fallback } as const;
}

type FieldSpec = typeof REQUIRED | ReturnType<typeof optional>;

const NODE_ENVS = ['production', 'development'] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

const DEFAULT_NODE_ENV: NodeEnv = 'production';

function normalizeNodeEnv(raw: string): NodeEnv {
    const lowered = raw.toLowerCase();
    const match = NODE_ENVS.find((candidate) => candidate === lowered);

    if (!match) {
        logger.warn(
            { provided: raw, fallback: DEFAULT_NODE_ENV },
            `Unrecognized NODE_ENV value, defaulting to "${DEFAULT_NODE_ENV}"`
        );
        return DEFAULT_NODE_ENV;
    }

    return match;
}

const SCHEMA = {
    DISCORD_BOT_TOKEN: { spec: REQUIRED, sensitive: true },
    DISCORD_BOT_CLIENT: { spec: REQUIRED, sensitive: false },
    DEVELOPER_ID: { spec: REQUIRED, sensitive: false },
    PREFIX: { spec: REQUIRED, sensitive: false },
    DISCORD_GUILD: { spec: optional(''), sensitive: false },
    DATABASE_URL: { spec: REQUIRED, sensitive: true },
    WEBHOOK_URL: { spec: REQUIRED, sensitive: true },
    NODE_ENV: { spec: optional(DEFAULT_NODE_ENV), sensitive: false },
} satisfies Record<string, { spec: FieldSpec; sensitive: boolean }>;

type SchemaKey = keyof typeof SCHEMA;

function redact(value: string, sensitive: boolean): string {
    if (!sensitive) return value || '(empty)';
    return value ? '[REDACTED]' : '(empty)';
}

function buildEnv(): Record<SchemaKey, string> {
    logger.trace({ keys: Object.keys(SCHEMA) }, 'Validating environment');

    const resolved = {} as Record<SchemaKey, string>;
    const missing: SchemaKey[] = [];

    for (const [key, { spec, sensitive }] of Object.entries(SCHEMA) as [SchemaKey, { spec: FieldSpec; sensitive: boolean }][]) {
        const raw = process.env[key]?.trim() ?? '';

        if (raw) {
            resolved[key] = raw;
            logger.trace({ key, value: redact(raw, sensitive) }, `Resolved: ${key}`);
            continue;
        }

        if (spec === REQUIRED) {
            missing.push(key);
        } else {
            resolved[key] = spec.fallback;
            logger.trace({ key, fallback: redact(spec.fallback, sensitive) }, `Optional fallback: ${key}`);
        }
    }

    if (missing.length > 0) {
        logger.fatal({ missing }, `Missing ${missing.length} required environment variable(s)`);
        process.exit(1);
    }

    resolved.NODE_ENV = normalizeNodeEnv(resolved.NODE_ENV);

    logger.info({
        CLIENT_ID: resolved.DISCORD_BOT_CLIENT,
        GUILD_ID: resolved.DISCORD_GUILD || '(not set)',
        DEVELOPER: resolved.DEVELOPER_ID,
        PREFIX: resolved.PREFIX,
        DATABASE_URL: redact(resolved.DATABASE_URL, SCHEMA.DATABASE_URL.sensitive),
        WEBHOOK_URL: redact(resolved.WEBHOOK_URL, SCHEMA.WEBHOOK_URL.sensitive),
        NODE_ENV: resolved.NODE_ENV,
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
    get DATABASE_URL() { return _env.DATABASE_URL; },
    get WEBHOOK_URL() { return _env.WEBHOOK_URL; },
    get NODE_ENV() { return _env.NODE_ENV as NodeEnv; },
    get IS_PRODUCTION() { return _env.NODE_ENV === 'production'; },
} as const;

export type Env = typeof env;
export type { NodeEnv };