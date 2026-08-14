
import { describe, it, expect } from 'vitest';
import { are_afk_channels_configured } from '../src/utils/AFK/is_configured';

describe('are_afk_channels_configured', () => {
    it('is true when both channels are set', () => {
        expect(are_afk_channels_configured(
            { panel_channel: 'chan-1' } as any,
            { afk_log: 'chan-2' } as any,
        )).toBe(true);
    });

    it('is false when panel_channel is missing', () => {
        expect(are_afk_channels_configured(
            {} as any,
            { afk_log: 'chan-2' } as any,
        )).toBe(false);
    });

    it('is false when afk_log is missing', () => {
        expect(are_afk_channels_configured(
            { panel_channel: 'chan-1' } as any,
            {} as any,
        )).toBe(false);
    });

    it('treats an empty string as not configured', () => {
        expect(are_afk_channels_configured(
            { panel_channel: '' } as any,
            { afk_log: 'chan-2' } as any,
        )).toBe(false);
    });

    it('treats a whitespace-only string as not configured', () => {
        expect(are_afk_channels_configured(
            { panel_channel: '   ' } as any,
            { afk_log: 'chan-2' } as any,
        )).toBe(false);
    });
});