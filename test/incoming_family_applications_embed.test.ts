import { describe, it, expect, vi } from 'vitest';
import type { GuildMember } from 'discord.js';

vi.mock('../src/utils/config/family_applications/applyFieldPresets', () => ({
    APPLY_FIELDS: {
        age: { label: 'Возраст' },
        reason: { label: 'Причина' },
    },
}));

vi.mock('../src/utils/family_applications/sanitizeText.helper', () => ({
    escapeForCodeBlock: (s: string) => s,
    truncateField: (s: string) => s,
}));

import {
    incoming_family_applications_embed,
    buildActionCustomId,
} from '../src/embed/family_applications/review/incoming.embed';

function makeMember(id: string): GuildMember {
    return {
        id,
        toString: () => `<@${id}>`,
        displayAvatarURL: () => `https://cdn.discordapp.com/avatar/${id}.png`,
    } as unknown as GuildMember;
}

const APPLY_TYPE = {
    name: 'Тестовая заявка',
    fields: ['age', 'reason'],
} as any; 

const BASE_PROPS = {
    applicationId: 'app-1',
    pingRole: 'role-1',
    applicant: makeMember('applicant-1'),
    fields: { age: '25', reason: 'Хочу вступить' },
    apply_type: APPLY_TYPE,
    submittedAt: '1700000000',
};


function collectCustomIds(node: any, out: string[] = []): string[] {
    if (!node || typeof node !== 'object') return out;
    if (typeof node.custom_id === 'string') out.push(node.custom_id);
    if (Array.isArray(node.components)) {
        for (const c of node.components) collectCustomIds(c, out);
    }
    return out;
}

function collectTextContents(node: any, out: string[] = []): string[] {
    if (!node || typeof node !== 'object') return out;
    if (typeof node.content === 'string') out.push(node.content);
    if (Array.isArray(node.components)) {
        for (const c of node.components) collectTextContents(c, out);
    }
    return out;
}

function render(overrides: Record<string, any> = {}) {
    const [container] = incoming_family_applications_embed({ ...BASE_PROPS, ...overrides } as any);
    const json = container.toJSON();
    return { json, customIds: collectCustomIds(json), texts: collectTextContents(json) };
}

describe('incoming_family_applications_embed — action buttons', () => {
    it('includes the "take" button when there is no reviewer yet', () => {
        const { customIds } = render();
        expect(customIds).toContain(buildActionCustomId('take', 'app-1'));
    });

    it('omits the "take" button once a reviewer has claimed the application', () => {
        const { customIds } = render({ reviewer: makeMember('reviewer-1') });
        expect(customIds).not.toContain(buildActionCustomId('take', 'app-1'));
    });

    it('always includes accept and reject buttons regardless of reviewer state', () => {
        const { customIds } = render({ reviewer: makeMember('reviewer-1') });
        expect(customIds).toContain(buildActionCustomId('accept', 'app-1'));
        expect(customIds).toContain(buildActionCustomId('reject', 'app-1'));
    });

    it('includes the "interview" button when no interview has been scheduled', () => {
        const { customIds } = render();
        expect(customIds).toContain(buildActionCustomId('interview', 'app-1'));
    });

    it('omits the "interview" button once interviewInvitedAt is set', () => {
        const { customIds } = render({ interviewInvitedAt: '1700001000' });
        expect(customIds).not.toContain(buildActionCustomId('interview', 'app-1'));
    });

    it('includes the "start_thread" button when no thread exists yet', () => {
        const { customIds } = render();
        expect(customIds).toContain(buildActionCustomId('start_thread', 'app-1'));
    });

    it('omits the "start_thread" button once a threadId is set', () => {
        const { customIds } = render({ threadId: 'thread-1' });
        expect(customIds).not.toContain(buildActionCustomId('start_thread', 'app-1'));
    });

    it('omits the "previuse_applications" button by default', () => {
        const { customIds } = render();
        expect(customIds).not.toContain(buildActionCustomId('previuse_applications', 'app-1'));
    });

    it('includes the "previuse_applications" button when explicitly enabled', () => {
        const { customIds } = render({ previuse_applications: true });
        expect(customIds).toContain(buildActionCustomId('previuse_applications', 'app-1'));
    });

    it('omits every action button when showActions is false', () => {
        const { customIds } = render({ showActions: false });
        expect(customIds).toEqual([]);
    });

    it('every rendered customId is scoped to this applicationId', () => {
        const { customIds } = render({ previuse_applications: true });
        for (const id of customIds) {
            expect(id.endsWith(':app-1')).toBe(true);
        }
    });
});

describe('incoming_family_applications_embed — header and footer text', () => {
    it('pings the role in the footer when no reviewer has claimed it yet', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('<@&role-1>'))).toBe(true);
    });

    it('shows the reviewer instead of the role ping once claimed', () => {
        const { texts } = render({ reviewer: makeMember('reviewer-1') });
        expect(texts.some((t) => t.includes('<@reviewer-1>'))).toBe(true);
        expect(texts.some((t) => t.includes('<@&role-1>'))).toBe(false);
    });

    it('includes the applicationId in the footer', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('app-1'))).toBe(true);
    });

    it('shows the "На обзвоне с" line when an interview is scheduled', () => {
        const { texts } = render({ interviewInvitedAt: '1700001000' });
        expect(texts.some((t) => t.includes('На обзвоне с'))).toBe(true);
    });

    it('does not show the interview line when no interview is scheduled', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('На обзвоне с'))).toBe(false);
    });

    it('shows the thread link line when a threadId is present', () => {
        const { texts } = render({ threadId: 'thread-1' });
        expect(texts.some((t) => t.includes('<#thread-1>'))).toBe(true);
    });

    it('does not show the thread link line when there is no thread', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('Переписка с заявителем'))).toBe(false);
    });
});

describe('incoming_family_applications_embed — field rendering', () => {
    it('renders each configured field using its APPLY_FIELDS label', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('Возраст'))).toBe(true);
        expect(texts.some((t) => t.includes('Причина'))).toBe(true);
    });

    it('renders the actual submitted answer for each field', () => {
        const { texts } = render();
        expect(texts.some((t) => t.includes('25'))).toBe(true);
        expect(texts.some((t) => t.includes('Хочу вступить'))).toBe(true);
    });

    it('falls back to the raw fieldId as the label when APPLY_FIELDS has no entry for it', () => {
        const { texts } = render({
            apply_type: { name: 'Тест', fields: ['unknown_field'] },
            fields: { unknown_field: 'value' },
        });
        expect(texts.some((t) => t.includes('unknown_field'))).toBe(true);
    });

    it('shows an em dash placeholder for a missing field answer', () => {
        const { texts } = render({ fields: {} });
        expect(texts.some((t) => t.includes('—'))).toBe(true);
    });

    it('shows an em dash placeholder for a whitespace-only field answer', () => {
        const { texts } = render({ fields: { age: '   ', reason: 'Хочу вступить' } });
        expect(texts.some((t) => t.includes('—'))).toBe(true);
        expect(texts.some((t) => t.includes('Хочу вступить'))).toBe(true);
    });
});