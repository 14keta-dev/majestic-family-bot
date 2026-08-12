import { describe, it, expect } from 'vitest';
import { matchCustomId } from '../src/utils/family_applications/match_custom_id';


describe('matchCustomId', () => {
    describe('static (non-dynamic) matching', () => {
        it('matches an exact id', () => {
            expect(matchCustomId('apply_select', 'apply_select')).toBe(true);
        });

        it('does not match a different id', () => {
            expect(matchCustomId('apply_select_2', 'apply_select')).toBe(false);
        });

        it('does NOT match a prefix relationship when dynamic is not set', () => {
            expect(matchCustomId('apply_modal:easy', 'apply_modal:')).toBe(false);
        });
    });

    describe('dynamic prefix matching', () => {
        it('matches when interactionId is prefix + ":" + suffix', () => {
            expect(matchCustomId('apply_modal:easy', 'apply_modal', { dynamic: true })).toBe(true);
        });

        it('matches multi-segment suffixes', () => {
            expect(
                matchCustomId(
                    'embed:family_applications:take:42',
                    'embed:family_applications:take',
                    { dynamic: true },
                ),
            ).toBe(true);
        });

        it('does NOT match without the ":" boundary (no "cooldownfoo" matching "cooldown")', () => {
            expect(matchCustomId('cooldownfoo', 'cooldown', { dynamic: true })).toBe(false);
        });

        it('does NOT match a same-prefix different word ("cooldown_open" vs "cooldown")', () => {
            expect(matchCustomId('cooldown_open', 'cooldown', { dynamic: true })).toBe(false);
        });

        it('REGRESSION: registering the prefix WITH a trailing colon breaks dynamic matching', () => {
            expect(matchCustomId('apply_modal:easy', 'apply_modal:', { dynamic: true })).toBe(false);
        });

        it('still matches an exact id even when dynamic is true', () => {
            expect(matchCustomId('apply_modal', 'apply_modal', { dynamic: true })).toBe(true);
        });
    });
});