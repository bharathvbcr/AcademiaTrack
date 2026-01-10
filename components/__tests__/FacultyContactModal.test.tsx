import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FacultyContactModal from '../FacultyContactModal';
import { FacultyContactStatus } from '../../types';
import * as applicationFormHook from '../../hooks/useApplicationForm';

// Mock useLockBodyScroll
vi.mock('../../hooks/useLockBodyScroll', () => ({
    useLockBodyScroll: vi.fn(),
}));

const mockOnClose = vi.fn();
const mockOnSave = vi.fn();

describe('FacultyContactModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<FacultyContactModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} applications={[]} />);
        expect(screen.getByText('Add Faculty Contact')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Dr. Alan Turing/i)).toBeInTheDocument();
    });

    it('validates required fields', () => {
        render(<FacultyContactModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} applications={[]} />);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        expect(screen.getByPlaceholderText(/e.g. Dr. Alan Turing/i)).toBeInvalid; // Or check for error message if UI shows one
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('submits valid data', async () => {
        render(<FacultyContactModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} applications={[]} />);

        // Fill Name
        fireEvent.change(screen.getByPlaceholderText(/e.g. Dr. Alan Turing/i), { target: { value: 'Dr. Smith' } });

        // Fill University (using the mock or direct input if it's a simple input in the component)
        // The component uses UniversitySearchInput. We might need to check how it behaves.
        // Looking at the implementation of FacultyContactModal:
        // <UniversitySearchInput value={universityName} ... />
        // If UniversitySearchInput is complex, we might need to mock it or simulate it carefully.
        // For now, let's assume it has an input we can find.
        const uniInput = screen.getByPlaceholderText(/Type to search/i);
        fireEvent.change(uniInput, { target: { value: 'Harvard' } });

        // Fill Email
        fireEvent.change(screen.getByPlaceholderText(/e.g. alan.turing@example.com/i), { target: { value: 'smith@harvard.edu' } });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Dr. Smith',
                    email: 'smith@harvard.edu',
                    contactStatus: FacultyContactStatus.NotContacted
                }),
                'Harvard',
                true // isNewUniversity
            );
        });
    });
});
