
import { describe, it, expect } from 'vitest';
import { VACATION_REVIEW_CUSTOM_IDS } from '../src/embed/vacation/vacation.components';
import { VACATION_LIST_PAGINATION_CUSTOM_ID } from '../src/embed/vacation/vacation.embed';

describe('vacation dynamic customId suffix extraction', () => {
    it('recovers a vacation entry id cleanly from an accept customId', () => {
        const entryId = 'abc-123';
        const built = `${VACATION_REVIEW_CUSTOM_IDS.accept}:${entryId}`;
        expect(built.slice(VACATION_REVIEW_CUSTOM_IDS.accept.length + 1)).toBe(entryId);
    });

    it('recovers a vacation entry id cleanly from a reject customId', () => {
        const entryId = 'abc-123';
        const built = `${VACATION_REVIEW_CUSTOM_IDS.reject}:${entryId}`;
        expect(built.slice(VACATION_REVIEW_CUSTOM_IDS.reject.length + 1)).toBe(entryId);
    });

    it('recovers a vacation entry id cleanly from a kick customId', () => {
        const entryId = 'abc-123';
        const built = `${VACATION_REVIEW_CUSTOM_IDS.kick}:${entryId}`;
        expect(built.slice(VACATION_REVIEW_CUSTOM_IDS.kick.length + 1)).toBe(entryId);
    });

    it('recovers a numeric page cleanly from a next-page customId', () => {
        const built = `${VACATION_LIST_PAGINATION_CUSTOM_ID.next}:3`;
        const raw = built.slice(VACATION_LIST_PAGINATION_CUSTOM_ID.next.length + 1);
        expect(Number.parseInt(raw, 10)).toBe(3);
    });

    it('recovers a numeric page cleanly from a prev-page customId', () => {
        const built = `${VACATION_LIST_PAGINATION_CUSTOM_ID.prev}:3`;
        const raw = built.slice(VACATION_LIST_PAGINATION_CUSTOM_ID.prev.length + 1);
        expect(Number.parseInt(raw, 10)).toBe(3);
    });
});