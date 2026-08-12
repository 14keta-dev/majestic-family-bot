
import type { FamilyApplicationsConfig } from "../config/family_applications";
import { Majestic_Servers } from "../emojis/server_emoji_map";

export interface FamilyApplicationsSetupDraft {
    initiatedBy?: string;
    isEdit?: boolean;
    server?: Majestic_Servers;
    apply_channel?: string;
    incoming_applications?: string;
    interview_channel?: string;
    accepted_archive?: string;
    rejected_archive?: string;
    status_log?: string;
    priority_roles?: string[];
}

const drafts = new Map<string, FamilyApplicationsSetupDraft>();
const lastTouched = new Map<string, number>();

const DRAFT_TTL_MS = 30 * 60 * 1000; 
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function touch(messageId: string): void {
    lastTouched.set(messageId, Date.now());
}

export function initDraft(messageId: string, initiatedBy: string): FamilyApplicationsSetupDraft {
    const draft: FamilyApplicationsSetupDraft = { initiatedBy };
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

function draftFromConfig(config: FamilyApplicationsConfig, initiatedBy?: string): FamilyApplicationsSetupDraft {
    return {
        initiatedBy,
        isEdit: true,
        server: config.server,
        apply_channel: config.channels.apply_channel,
        incoming_applications: config.channels.incoming_applications,
        interview_channel: config.channels.interview_channel,
        accepted_archive: config.channels.accepted_archive,
        rejected_archive: config.channels.rejected_archive,
        status_log: config.channels.status_log,
        priority_roles: config.priority_roles,
    };
}

export function buildEditDraftPreview(config: FamilyApplicationsConfig): FamilyApplicationsSetupDraft {
    return draftFromConfig(config);
}

export function initEditDraft(
    messageId: string,
    initiatedBy: string,
    config: FamilyApplicationsConfig,
): FamilyApplicationsSetupDraft {
    const draft = draftFromConfig(config, initiatedBy);
    drafts.set(messageId, draft);
    touch(messageId);
    return draft;
}

export function getDraft(messageId: string): FamilyApplicationsSetupDraft {
    return drafts.get(messageId) ?? {};
}

export function setDraftField<K extends keyof FamilyApplicationsSetupDraft>(
    messageId: string,
    key: K,
    value: FamilyApplicationsSetupDraft[K],
): FamilyApplicationsSetupDraft {
    const next = { ...getDraft(messageId), [key]: value };
    drafts.set(messageId, next);
    touch(messageId);
    return next;
}

export function clearDraft(messageId: string): void {
    drafts.delete(messageId);
    lastTouched.delete(messageId);
}


const REQUIRED_KEYS: (keyof FamilyApplicationsSetupDraft)[] = [
    "server",
    "apply_channel",
    "incoming_applications",
    "interview_channel",
    "accepted_archive",
    "rejected_archive",
];

export function missingDraftFields(draft: FamilyApplicationsSetupDraft): (keyof FamilyApplicationsSetupDraft)[] {
    return REQUIRED_KEYS.filter((key) => !draft[key]);
}

export function isDraftComplete(draft: FamilyApplicationsSetupDraft): boolean {
    return missingDraftFields(draft).length === 0;
}

export function startDraftSweeper(): NodeJS.Timeout {
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [messageId, ts] of lastTouched) {
            if (now - ts > DRAFT_TTL_MS) {
                clearDraft(messageId);
            }
        }
    }, SWEEP_INTERVAL_MS);
    timer.unref(); 
    return timer;
}