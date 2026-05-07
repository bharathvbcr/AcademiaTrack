import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import { ProgramType } from '../../types';

vi.mock('../AdvancedSearchBar', () => ({
  default: () => <div data-testid="advanced-search-bar" />,
}));

vi.mock('../Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderHeader = (viewMode: 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline') => {
  const onViewChange = vi.fn();

  render(
    <Header
      onAddNew={vi.fn()}
      onAddFaculty={vi.fn()}
      defaultProgramType={ProgramType.PhD}
      onSetDefaultProgramType={vi.fn()}
      onExport={vi.fn()}
      onImport={vi.fn()}
      viewMode={viewMode}
      onViewChange={onViewChange}
      applications={[]}
      onSearch={vi.fn()}
    />
  );

  return { onViewChange };
};

describe('Header view switching', () => {
  it('keeps primary view tabs directly clickable from another active view', () => {
    const { onViewChange } = renderHeader('faculty');

    fireEvent.click(screen.getByRole('button', { name: 'Kanban Board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }));
    fireEvent.click(screen.getByRole('button', { name: 'Faculty' }));

    expect(onViewChange).toHaveBeenNthCalledWith(1, 'kanban');
    expect(onViewChange).toHaveBeenNthCalledWith(2, 'budget');
    expect(onViewChange).toHaveBeenNthCalledWith(3, 'faculty');
  });
});
