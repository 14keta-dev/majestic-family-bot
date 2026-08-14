export interface Vacation_config_draft {
  initiatedBy?: string;
  isEdit?: boolean;
  controlled?: boolean;
  vacation_role?: string;
  panel_channel?: string;
  ping_role?: string[];
  incoming_request?: string;
  vacation_log?: string;
}

const drafts = new Map<string, Vacation_config_draft>();
const lastTouched = new Map<string, number>();

const DRAFT_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function touch(messageId: string): void {
  lastTouched.set(messageId, Date.now());
}

export function initVacationDraft(
  messageId: string,
  initiatedBy: string,
): Vacation_config_draft {
  const draft: Vacation_config_draft = { initiatedBy };
  drafts.set(messageId, draft);
  touch(messageId);
  return draft;
}

function draftVacationFromConfig(
  config: Vacation_config_draft,
  initiatedBy?: string,
): Vacation_config_draft {
  return {
    initiatedBy,
    isEdit: true,
    controlled: config.controlled,
    vacation_role: config.vacation_role,
    panel_channel: config.panel_channel,
    ping_role: config.ping_role,
    incoming_request: config.incoming_request,
  };
}

export function buildEditVacationDraftPreview(
  config: Vacation_config_draft,
): Vacation_config_draft {
  return draftVacationFromConfig(config);
}

export function initVacationEditDraft(
  messageId: string,
  initiatedBy: string,
  config: Vacation_config_draft,
): Vacation_config_draft {
  const draft = draftVacationFromConfig(config, initiatedBy);
  drafts.set(messageId, draft);
  touch(messageId);
  return draft;
}

export function getVacationDraft(messageId: string): Vacation_config_draft {
  return drafts.get(messageId) ?? {};
}

export function setVacationDraftField<K extends keyof Vacation_config_draft>(
  messageId: string,
  key: K,
  value: Vacation_config_draft[K],
): Vacation_config_draft {
  const next = { ...getVacationDraft(messageId), [key]: value };
  drafts.set(messageId, next);
  touch(messageId);
  return next;
}

export function setVacationDraftType(
  messageId: string,
  controlled: boolean,
): Vacation_config_draft {
  const current = getVacationDraft(messageId);
  const next: Vacation_config_draft = {
    ...current,
    controlled,
    ...(controlled
      ? {}
      : {
        ping_role: undefined,
        incoming_request: undefined,
      }),
  };
  drafts.set(messageId, next);
  touch(messageId);
  return next;
}

export function clearVacationDraft(messageId: string): void {
  drafts.delete(messageId);
  lastTouched.delete(messageId);
}

const ALWAYS_REQUIRED_KEYS: (keyof Vacation_config_draft)[] = [
  "vacation_role",
  "panel_channel",
];
const CONTROLLED_REQUIRED_KEYS: (keyof Vacation_config_draft)[] = [
  "incoming_request",
];

export function missingVacationDraftFields(
  draft: Vacation_config_draft,
): (keyof Vacation_config_draft)[] {
  if (draft.controlled === undefined) return ["controlled"];

  const missing = ALWAYS_REQUIRED_KEYS.filter((key) => !draft[key]);

  if (draft.controlled) {
    missing.push(...CONTROLLED_REQUIRED_KEYS.filter((key) => !draft[key]));
    if (!draft.ping_role || draft.ping_role.length === 0) {
      missing.push("ping_role");
    }
  }

  return missing;
}

export function isVacationDraftComplete(draft: Vacation_config_draft): boolean {
  return missingVacationDraftFields(draft).length === 0;
}

export function startVacationDraftSweeper(): NodeJS.Timeout {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [messageId, ts] of lastTouched) {
      if (now - ts > DRAFT_TTL_MS) {
        clearVacationDraft(messageId);
      }
    }
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}
