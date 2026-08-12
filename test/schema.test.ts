
import { describe, it, expect } from 'vitest';
import { parsePartialConfig, validateFullConfig } from '../src/utils/config/schema';
import { DEFAULT_CONFIG } from '../src/utils/config/default_path';
import { Majestic_Servers } from '../src/utils/emojis/server_emoji_map';

describe('validateFullConfig', () => {
    it('accepts DEFAULT_CONFIG as-is', () => {
        expect(() => validateFullConfig(DEFAULT_CONFIG)).not.toThrow();
    });

    it('rejects a config missing a required channel field', () => {
        const broken = structuredClone(DEFAULT_CONFIG) as any;
        delete broken.family_applications.channels.apply_channel;
        expect(() => validateFullConfig(broken)).toThrow();
    });

    it('rejects an invalid server enum value', () => {
        const broken = structuredClone(DEFAULT_CONFIG) as any;
        broken.family_applications.server = 'Not_A_Real_Server';
        expect(() => validateFullConfig(broken)).toThrow();
    });

    it('accepts an optional status_log channel when present', () => {
        const withStatusLog = structuredClone(DEFAULT_CONFIG) as any;
        withStatusLog.family_applications.channels.status_log = '123456789';
        expect(() => validateFullConfig(withStatusLog)).not.toThrow();
    });
});

describe('parsePartialConfig', () => {
    it('accepts an empty object (nothing overridden)', () => {
        expect(() => parsePartialConfig({})).not.toThrow();
    });

    it('accepts a partial override of a single channel', () => {
        const partial = {
            family_applications: {
                active: true,
                channels: { apply_channel: '111' },
            },
        };
        const result = parsePartialConfig(partial);
        expect(result.family_applications?.channels?.apply_channel).toBe('111');
    });

    it('rejects a malformed server enum even in a partial config', () => {
        const partial = {
            family_applications: {
                active: true,
                server: 'Nonexistent_City',
            },
        };
        expect(() => parsePartialConfig(partial)).toThrow();
    });

    it('rejects non-string values where strings are required', () => {
        const partial = {
            family_applications: {
                active: true,
                channels: { apply_channel: 12345 },
            },
        };
        expect(() => parsePartialConfig(partial)).toThrow();
    });
});

describe('DEFAULT_CONFIG sanity', () => {
    it('uses a valid Majestic_Servers value', () => {
        expect(Object.values(Majestic_Servers)).toContain(DEFAULT_CONFIG.family_applications.server);
    });
});