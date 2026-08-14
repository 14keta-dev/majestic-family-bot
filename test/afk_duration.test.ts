
import { describe, it, expect } from 'vitest';
import { parseAfkDurationMinutes, Invalid_afk_duration } from '../src/utils/AFK/afk.schema';

describe('parseAfkDurationMinutes', () => {
    it.each([
        ['30m', 30],
        ['1h', 60],
        ['12h', 720],
        ['1h30m', 90],
        ['1h 30m', 90],
        ['1H30M', 90],
        ['24h', 1440],
    ])('parses "%s" as %i minutes', (raw, expected) => {
        expect(parseAfkDurationMinutes(raw)).toBe(expected);
    });

    it('accepts the minimum boundary (30m)', () => {
        expect(parseAfkDurationMinutes('30m')).toBe(30);
    });

    it('accepts the maximum boundary (24h / 1440m)', () => {
        expect(parseAfkDurationMinutes('24h')).toBe(1440);
    });

    it('rejects below the minimum', () => {
        expect(() => parseAfkDurationMinutes('29m')).toThrow(Invalid_afk_duration);
    });

    it('rejects above the maximum', () => {
        expect(() => parseAfkDurationMinutes('25h')).toThrow(Invalid_afk_duration);
    });

    it('rejects a zero duration', () => {
        expect(() => parseAfkDurationMinutes('0m')).toThrow(Invalid_afk_duration);
        expect(() => parseAfkDurationMinutes('0h')).toThrow(Invalid_afk_duration);
    });

    it('rejects an unparseable string', () => {
        expect(() => parseAfkDurationMinutes('abc')).toThrow(Invalid_afk_duration);
    });

    it('rejects an empty string', () => {
        expect(() => parseAfkDurationMinutes('')).toThrow(Invalid_afk_duration);
    });

    it('rejects whitespace-only input', () => {
        expect(() => parseAfkDurationMinutes('   ')).toThrow(Invalid_afk_duration);
    });

    it('error carries the original raw input for user-facing display', () => {
        try {
            parseAfkDurationMinutes('nonsense');
            expect.fail('expected throw');
        } catch (error) {
            expect(error).toBeInstanceOf(Invalid_afk_duration);
            expect((error as Invalid_afk_duration).raw).toBe('nonsense');
        }
    });
});