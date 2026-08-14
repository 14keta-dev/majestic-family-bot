
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunk } from '../src/utils/vacation/vacation_list.helper';

vi.mock('../src/utils/vacation/vacation.schema', () => ({
    listActiveVacations: vi.fn(),
    formatDateTimeDDMMYYYY: (d: Date) => d.toISOString(),
    formatVacationDuration: () => '1d 2h',
}));

import { listActiveVacations } from '../src/utils/vacation/vacation.schema';
import { renderVacationListPage } from '../src/utils/vacation/vacation_list.helper';

function makeEntry(userId: string) {
    return {
        userId,
        reason: 'test',
        startedAt: '2026-01-01T00:00:00.000Z',
        estimated_end: '2026-01-02T00:00:00.000Z',
        roles_romeved: [],
    } as any;
}

describe('chunk', () => {
    it('splits evenly divisible arrays', () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('puts the remainder in a final short page', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns a single page when size >= length', () => {
        expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it('returns an empty array for an empty input', () => {
        expect(chunk([], 5)).toEqual([]);
    });
});

describe('renderVacationListPage', () => {
    beforeEach(() => {
        vi.mocked(listActiveVacations).mockReset();
    });

    it('shows the empty-state embed with no components when nobody is active', async () => {
        vi.mocked(listActiveVacations).mockReturnValue([]);
        const { embeds, components } = await renderVacationListPage(0, 1);
        expect(components).toEqual([]);
        expect(embeds[0].data.description).toContain('никто не в отпуске');
    });

    it('advances forward within range', async () => {
        vi.mocked(listActiveVacations).mockReturnValue(
            Array.from({ length: 12 }, (_, i) => makeEntry(`user-${i}`)),
        );
        const { embeds } = await renderVacationListPage(0, 1);
        expect(embeds[0].data.footer?.text).toContain('2/3');
    });

    it('clamps forward at the last page instead of overshooting', async () => {
        vi.mocked(listActiveVacations).mockReturnValue(
            Array.from({ length: 12 }, (_, i) => makeEntry(`user-${i}`)),
        );
        const { embeds } = await renderVacationListPage(2, 1); 
        expect(embeds[0].data.footer?.text).toContain('3/3');
    });

    it('clamps backward at the first page instead of going negative', async () => {
        vi.mocked(listActiveVacations).mockReturnValue(
            Array.from({ length: 12 }, (_, i) => makeEntry(`user-${i}`)),
        );
        const { embeds } = await renderVacationListPage(0, -1);
        expect(embeds[0].data.footer?.text).toContain('1/3');
    });

    it('omits pagination components when everything fits on one page', async () => {
        vi.mocked(listActiveVacations).mockReturnValue([makeEntry('user-0')]);
        const { components } = await renderVacationListPage(0, 1);
        expect(components).toEqual([]);
    });

    it('re-fetches fresh data on every call rather than trusting the caller-supplied page count', async () => {
        vi.mocked(listActiveVacations).mockReturnValue(
            Array.from({ length: 12 }, (_, i) => makeEntry(`user-${i}`)),
        );
        await renderVacationListPage(2, 1);
        expect(listActiveVacations).toHaveBeenCalledTimes(1);
    });
});