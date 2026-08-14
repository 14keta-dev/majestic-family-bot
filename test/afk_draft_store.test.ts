
import { describe, it, expect, afterEach } from 'vitest';
import {
    initAfkDraft,
    initAfkEditDraft,
    buildEditAfkDraftPreview,
    getAfkDraft,
    setAfkDraftField,
    clearAfkDraft,
    missingAfkDraftFields,
    isAfkDraftComplete,
} from '../src/utils/AFK/draft_afk_store';

const usedIds: string[] = [];
function id(name: string): string {
    const msgId = `test:${name}:${Math.random()}`;
    usedIds.push(msgId);
    return msgId;
}
afterEach(() => {
    while (usedIds.length) clearAfkDraft(usedIds.pop()!);
});

describe('draft lifecycle', () => {
    it('returns an empty draft for an unknown messageId', () => {
        expect(getAfkDraft('never-created')).toEqual({});
    });

    it('initAfkDraft creates a fresh draft with only initiatedBy set', () => {
        const msgId = id('fresh');
        const draft = initAfkDraft(msgId, 'user-1');
        expect(draft).toEqual({ initiatedBy: 'user-1' });
        expect(getAfkDraft(msgId)).toEqual({ initiatedBy: 'user-1' });
    });

    it('setAfkDraftField merges a field into an existing draft without dropping others', () => {
        const msgId = id('merge');
        initAfkDraft(msgId, 'user-1');
        setAfkDraftField(msgId, 'panel_channel', 'chan-1');
        const draft = setAfkDraftField(msgId, 'afk_log', 'chan-2');

        expect(draft).toEqual({
            initiatedBy: 'user-1',
            panel_channel: 'chan-1',
            afk_log: 'chan-2',
        });
    });

    it('clearAfkDraft removes the draft entirely', () => {
        const msgId = id('clear');
        initAfkDraft(msgId, 'user-1');
        clearAfkDraft(msgId);
        expect(getAfkDraft(msgId)).toEqual({});
    });
});

describe('buildEditAfkDraftPreview / initAfkEditDraft', () => {
    it('marks the draft as isEdit and copies only panel_channel/afk_log from config', () => {
        const preview = buildEditAfkDraftPreview({ panel_channel: 'chan-1', afk_log: 'chan-2' });
        expect(preview).toEqual({
            initiatedBy: undefined,
            isEdit: true,
            panel_channel: 'chan-1',
            afk_log: 'chan-2',
        });
    });

    it('initAfkEditDraft persists the edit draft under the given messageId', () => {
        const msgId = id('edit');
        const draft = initAfkEditDraft(msgId, 'user-2', { panel_channel: 'chan-1' });
        expect(draft.isEdit).toBe(true);
        expect(draft.initiatedBy).toBe('user-2');
        expect(getAfkDraft(msgId)).toEqual(draft);
    });
});

describe('missingAfkDraftFields / isAfkDraftComplete', () => {
    it('reports panel_channel missing on an empty draft', () => {
        expect(missingAfkDraftFields({})).toEqual(['panel_channel']);
        expect(isAfkDraftComplete({})).toBe(false);
    });

    it('is complete once panel_channel is set, even without afk_log', () => {
        const draft = { panel_channel: 'chan-1' };
        expect(missingAfkDraftFields(draft)).toEqual([]);
        expect(isAfkDraftComplete(draft)).toBe(true);
    });
});