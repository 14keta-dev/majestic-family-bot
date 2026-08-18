import { backpack_interface } from "../config/backpack";

export interface Backpack_config_draft {
    initiatedBy?: string;
    isEdit?: boolean;
    panel_channel?: string;
    allowed_roles?: string[]
}

const drafts = new Map<string, Backpack_config_draft>();
const lastTouched = new Map<string, number>();

const DRAFT_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function touch(messageId: string): void {
    lastTouched.set(messageId, Date.now());
}

export function initBackpackDraft(messageId: string, initiatedBy: string): Backpack_config_draft {
    const draft: Backpack_config_draft = { initiatedBy };
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

function draftBackpackFromConfig(config: backpack_interface, initiatedBy?: string): Backpack_config_draft {
    return {
        initiatedBy,
        isEdit: true,
        panel_channel: config.panel_channel,
        allowed_roles: config.allowed_roles,
    };
}



export function buildEditBackpackDraftPreview(config: backpack_interface): Backpack_config_draft {
    return draftBackpackFromConfig(config);
}

export function initBackpackEditDraft(
    messageId: string,
    initiatedBy: string,
    config: backpack_interface,
): Backpack_config_draft {
    const draft = draftBackpackFromConfig(config, initiatedBy);
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

export function getBackpackDraft(messageId: string): Backpack_config_draft {
    return drafts.get(messageId) ?? {};
}

export function setBackpackDraftField<K extends keyof Backpack_config_draft>(
    messageId: string,
    key: K,
    value: Backpack_config_draft[K],
): Backpack_config_draft {
    const next = { ...getBackpackDraft(messageId), [key]: value };
    drafts.set(messageId, next);
    touch(messageId);
    return next;
}

export function clearBackpackDraft(messageId: string): void {
    drafts.delete(messageId);
    lastTouched.delete(messageId);
}

const REQUIRED_KEYS: (keyof Backpack_config_draft)[] = ["panel_channel", "allowed_roles"];

export function missingBackpackDraftFields(draft: Backpack_config_draft): (keyof Backpack_config_draft)[] {
    return REQUIRED_KEYS.filter((key) => !draft[key]);
}

export function isBackpackDraftComplete(draft: Backpack_config_draft): boolean {
    return missingBackpackDraftFields(draft).length === 0;
}

export function startBackpackDraftSweeper(): NodeJS.Timeout {
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [messageId, ts] of lastTouched) {
            if (now - ts > DRAFT_TTL_MS) {
                clearBackpackDraft(messageId);
            }
        }
    }, SWEEP_INTERVAL_MS);
    timer.unref();
    return timer;
}

