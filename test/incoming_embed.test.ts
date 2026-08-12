import { describe, it, expect } from 'vitest';
import {
    INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID,
    buildActionCustomId,
    parseIncomingActionCustomId,
} from '../src/embed/family_applications/review/incoming.embed';

const APPLICATION_IDS = ['42', '1', '999999', 'abc-123'];

describe('incoming application action customIds', () => {
    it.each(Object.keys(INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID) as Array<
        keyof typeof INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID
    >)('round-trips build -> parse for action "%s"', (action) => {
        for (const appId of APPLICATION_IDS) {
            const built = buildActionCustomId(action, appId);
            const parsed = parseIncomingActionCustomId(built);

            expect(parsed).toBeDefined();
            expect(parsed?.action).toBe(action);
            expect(parsed?.applicationId).toBe(appId);
        }
    });

    it('none of the registered prefixes end with a trailing colon', () => {
        for (const prefix of Object.values(INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID)) {
            expect(prefix.endsWith(':')).toBe(false);
        }
    });

    it('returns undefined for an unrecognized customId', () => {
        expect(parseIncomingActionCustomId('not_a_real_action:42')).toBeUndefined();
    });

    it('does not cross-match between different actions sharing a common prefix', () => {
        const rejectId = buildActionCustomId('reject', '42');
        const parsed = parseIncomingActionCustomId(rejectId);
        expect(parsed?.action).toBe('reject');
        expect(parsed?.applicationId).toBe('42');
    });

    it('does not accidentally match "reject" against a reject-modal-style id', () => {
        const modalStyleId = `${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.reject}:modal:42`;
        const parsed = parseIncomingActionCustomId(modalStyleId);
        expect(parsed?.action).toBe('reject');
        expect(parsed?.applicationId).toBe('modal:42');
    });
});