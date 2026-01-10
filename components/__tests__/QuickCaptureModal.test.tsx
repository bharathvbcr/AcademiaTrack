import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickCaptureModal from '../QuickCaptureModal';
import { Application, ProgramType, ApplicationStatus } from '../../types';
import * as locationService from '../../utils/locationService';

// Mock the location service
vi.mock('../../utils/locationService', () => ({
    searchLocation: vi.fn(),
}));

// Mock useLockBodyScroll
vi.mock('../../hooks/useLockBodyScroll', () => ({
    useLockBodyScroll: vi.fn(),
}));

const mockOnClose = vi.fn();
const mockOnSave = vi.fn();

describe('QuickCaptureModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when closed', () => {
        render(<QuickCaptureModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);
        expect(screen.queryByText('Quick Capture')).not.toBeInTheDocument();
    });

    it('renders correctly when open', () => {
        render(<QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
        expect(screen.getByText('Quick Capture')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Stanford University/i)).toBeInTheDocument();
    });

    it('closes on escape key', () => {
        render(<QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
        const input = screen.getByPlaceholderText(/e.g. Stanford University/i);
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('parses input correctly and submits', async () => {
        // Mock location service response
        (locationService.searchLocation as any).mockResolvedValue([
            { city: 'Cambridge', state: 'MA', country: 'USA' }
        ]);

        render(<QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

        const input = screen.getByPlaceholderText(/e.g. Stanford University/i);
        fireEvent.change(input, { target: { value: 'MIT, PhD, in Computer Science, Dec 15' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                universityName: 'MIT',
                programType: ProgramType.PhD,
                programName: 'Computer Science', // logic strips "in "
                department: 'Computer Science',
                location: 'Cambridge, MA, USA',
                status: ApplicationStatus.NotStarted
            }));
        });
    });

    it('parses Masters programs correctly', async () => {
        render(<QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

        const input = screen.getByPlaceholderText(/e.g. Stanford University/i);
        fireEvent.change(input, { target: { value: 'Stanford, MS, in Data Science' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
            const calledArg = mockOnSave.mock.calls[0][0];
            expect(calledArg.programType).toBe(ProgramType.Masters);
            expect(calledArg.programName).toBe('Data Science');
        });
    });
});
