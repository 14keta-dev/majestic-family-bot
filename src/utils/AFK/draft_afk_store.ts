export interface AFK_config_draft {
    initiatedBy?: string;
    isEdit?: boolean;
    panel_channel?: string;
    afk_log?: string;
}

const drafts = new Map<string, AFK_config_draft>();
const lastTouched = new Map<string, number>();

const DRAFT_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function touch(messageId: string): void {
    lastTouched.set(messageId, Date.now());
}

export function initAfkDraft(messageId: string, initiatedBy: string): AFK_config_draft {
    const draft: AFK_config_draft = { initiatedBy };
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

function draftAfkFromConfig(config: AFK_config_draft, initiatedBy?: string): AFK_config_draft {
    return {
        initiatedBy,
        isEdit: true,
        panel_channel: config.panel_channel,
        afk_log: config.afk_log,
    };
}

export function buildEditAfkDraftPreview(config: AFK_config_draft): AFK_config_draft {
    return draftAfkFromConfig(config);
}

export function initAfkEditDraft(
    messageId: string,
    initiatedBy: string,
    config: AFK_config_draft,
): AFK_config_draft {
    const draft = draftAfkFromConfig(config, initiatedBy);
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

export function getAfkDraft(messageId: string): AFK_config_draft {
    return drafts.get(messageId) ?? {};
}

export function setAfkDraftField<K extends keyof AFK_config_draft>(
    messageId: string,
    key: K,
    value: AFK_config_draft[K],
): AFK_config_draft {
    const next = { ...getAfkDraft(messageId), [key]: value };
    drafts.set(messageId, next);
    touch(messageId);
    return next;
}

export function clearAfkDraft(messageId: string): void {
    drafts.delete(messageId);
    lastTouched.delete(messageId);
}

const REQUIRED_KEYS: (keyof AFK_config_draft)[] = ["panel_channel"];

export function missingAfkDraftFields(draft: AFK_config_draft): (keyof AFK_config_draft)[] {
    return REQUIRED_KEYS.filter((key) => !draft[key]);
}

export function isAfkDraftComplete(draft: AFK_config_draft): boolean {
    return missingAfkDraftFields(draft).length === 0;
}

export function startAfkDraftSweeper(): NodeJS.Timeout {
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [messageId, ts] of lastTouched) {
            if (now - ts > DRAFT_TTL_MS) {
                clearAfkDraft(messageId);
            }
        }
    }, SWEEP_INTERVAL_MS);
    timer.unref();
    return timer;
}