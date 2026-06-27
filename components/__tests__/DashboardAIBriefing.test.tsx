import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardAIBriefing from '../DashboardAIBriefing';
import { buildPortfolioInsightsMessages, DEFAULT_AI_SETTINGS } from '../../services/ai';
import type { UseAIReturn } from '../../hooks/useAI';
import type { Application } from '../../types';

// framer-motion's AnimatePresence/motion are noisy in jsdom; render plain divs.
vi.mock('framer-motion', () => ({
    motion: new Proxy({}, { get: () => (props: any) => <div {...props} /> }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const apps = [
    { id: 'a1', universityName: 'MIT', programName: 'EECS PhD', status: 'In Progress', deadline: null, documents: {} },
    { id: 'a2', universityName: 'Stanford', programName: 'CS PhD', status: 'Submitted', deadline: null, documents: {} },
] as unknown as Application[];

function makeAI(overrides: Partial<UseAIReturn> = {}): UseAIReturn {
    return {
        settings: { ...DEFAULT_AI_SETTINGS, enabled: true, model: 'llama3.1' },
        updateSettings: vi.fn(),
        connection: { status: 'idle' },
        setConnection: vi.fn(),
        testConnection: vi.fn(),
        chat: vi.fn().mockResolvedValue(''),
        stop: vi.fn(),
        isGenerating: false,
        isConfigured: true,
        ...overrides,
    } as unknown as UseAIReturn;
}

describe('DashboardAIBriefing', () => {
    it('prompts the user to configure a local model when AI is not set up', () => {
        const onConfigureAI = vi.fn();
        render(<DashboardAIBriefing applications={apps} ai={makeAI({ isConfigured: false })} onConfigureAI={onConfigureAI} />);

        const setup = screen.getByText('Set up a local model');
        fireEvent.click(setup);
        expect(onConfigureAI).toHaveBeenCalled();
        // No generate button until configured.
        expect(screen.queryByText('Generate briefing')).toBeNull();
    });

    it('streams a portfolio briefing from the local model on demand', async () => {
        const chat = vi.fn(async (_messages, onToken?: (d: string) => void) => {
            onToken?.('All ');
            onToken?.('on track.');
            return 'All on track.';
        });
        render(<DashboardAIBriefing applications={apps} ai={makeAI({ chat })} onConfigureAI={vi.fn()} />);

        fireEvent.click(screen.getByText('Generate briefing'));

        // It grounds the request in the full portfolio via the shared prompt builder.
        expect(chat).toHaveBeenCalledWith(buildPortfolioInsightsMessages(apps), expect.any(Function));
        await waitFor(() => expect(screen.getByText(/All on track\./)).toBeInTheDocument());
        // After a run, the action becomes a regenerate.
        expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });
});
