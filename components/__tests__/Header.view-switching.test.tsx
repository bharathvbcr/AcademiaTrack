import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import { ProgramType } from '../../types';
import { ViewMode } from '../../hooks/useViewState';

vi.mock('../AdvancedSearchBar', () => ({
  default: () => <div data-testid="advanced-search-bar" />,
}));

vi.mock('../Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderHeader = (viewMode: ViewMode) => {
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

const renderStatefulHeader = (initialViewMode: ViewMode) => {
  const HeaderHarness = () => {
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

    return (
      <>
        <Header
          onAddNew={vi.fn()}
          onAddFaculty={vi.fn()}
          defaultProgramType={ProgramType.PhD}
          onSetDefaultProgramType={vi.fn()}
          onExport={vi.fn()}
          onImport={vi.fn()}
          viewMode={viewMode}
          onViewChange={setViewMode}
          applications={[]}
          onSearch={vi.fn()}
        />
        <div data-testid="active-view">{viewMode}</div>
      </>
    );
  };

  render(<HeaderHarness />);
};

describe('Header view switching', () => {
  it('calls exact view modes from hover-expanded groups', () => {
    const { onViewChange } = renderHeader('faculty');

    fireEvent.mouseEnter(screen.getByLabelText('Applications view group'));
    fireEvent.click(screen.getByRole('button', { name: 'Kanban Board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }));

    fireEvent.mouseEnter(screen.getByLabelText('Resources view group'));
    fireEvent.click(screen.getByRole('button', { name: 'Faculty' }));

    expect(onViewChange).toHaveBeenNthCalledWith(1, 'kanban');
    expect(onViewChange).toHaveBeenNthCalledWith(2, 'budget');
    expect(onViewChange).toHaveBeenNthCalledWith(3, 'faculty');
  });

  it('commits pointer tab presses before hover re-renders can detach the button', () => {
    const { onViewChange } = renderHeader('list');

    const kanbanButton = screen.getByRole('button', { name: 'Kanban Board' });

    fireEvent.pointerDown(kanbanButton, { button: 0 });
    fireEvent.click(kanbanButton);

    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('kanban');
  });

  it('restores collapsed hover animation while switching rendered active tabs', () => {
    renderStatefulHeader('faculty');

    expect(screen.getByRole('button', { name: 'Faculty' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Kanban Board' })).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByLabelText('Applications view group'));
    fireEvent.click(screen.getByRole('button', { name: 'Kanban Board' }));

    expect(screen.getByTestId('active-view')).toHaveTextContent('kanban');
    expect(screen.getByRole('button', { name: 'Kanban Board' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.mouseEnter(screen.getByLabelText('Schedule view group'));
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));

    expect(screen.getByTestId('active-view')).toHaveTextContent('calendar');
    expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.mouseEnter(screen.getByLabelText('Resources view group'));
    fireEvent.click(screen.getByRole('button', { name: 'Recommenders' }));

    expect(screen.getByTestId('active-view')).toHaveTextContent('recommenders');
    expect(screen.getByRole('button', { name: 'Recommenders' })).toHaveAttribute('aria-pressed', 'true');
  });
});
