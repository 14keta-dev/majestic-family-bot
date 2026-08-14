
import { describe, it, expect } from 'vitest';
import { VACATION_LIST_PAGINATION_CUSTOM_ID } from '../src/embed/vacation/vacation.embed';
import { VACATION_REVIEW_CUSTOM_IDS } from '../src/embed/vacation/vacation.components';
import { AFK_LOG_BUTTON_CUSTOM_ID } from '../src/modals/AFK/enter.modal';
import { AFK_KICK_MODAL_CUSTOM_ID } from '../src/buttons/afk/kick.button';

describe('dynamic-prefix customId constants must not end in ":"', () => {
    it.each(Object.entries(VACATION_LIST_PAGINATION_CUSTOM_ID))(
        'VACATION_LIST_PAGINATION_CUSTOM_ID.%s',
        (_key, value) => {
            expect(value.endsWith(':')).toBe(false);
        },
    );

    it.each(Object.entries(VACATION_REVIEW_CUSTOM_IDS))(
        'VACATION_REVIEW_CUSTOM_IDS.%s',
        (_key, value) => {
            expect(value.endsWith(':')).toBe(false);
        },
    );

    it('AFK_LOG_BUTTON_CUSTOM_ID.kick has no trailing colon', () => {
        expect(AFK_LOG_BUTTON_CUSTOM_ID.kick.endsWith(':')).toBe(false);
    });

    it('AFK_KICK_MODAL_CUSTOM_ID.prefix has no trailing colon', () => {
        expect(AFK_KICK_MODAL_CUSTOM_ID.prefix.endsWith(':')).toBe(false);
    });
});