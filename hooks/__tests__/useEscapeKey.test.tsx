import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { useEscapeKey } from '../useEscapeKey';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; label?: string }> = ({ isOpen, onClose, label }) => {
  useEscapeKey(isOpen, onClose);
  return <div data-testid={label ?? 'modal'}>{isOpen ? 'open' : 'closed'}</div>;
};

const pressEscape = () => fireEvent.keyDown(document, { key: 'Escape' });

describe('useEscapeKey', () => {
  it('calls onClose when Escape is pressed while open', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} />);
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when closed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={false} onClose={onClose} />);
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores non-Escape keys', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('only closes the topmost modal when several are open', () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    render(
      <>
        <Modal isOpen onClose={onCloseA} label="a" />
        <Modal isOpen onClose={onCloseB} label="b" />
      </>
    );
    // B mounted last → it is on top.
    pressEscape();
    expect(onCloseB).toHaveBeenCalledTimes(1);
    expect(onCloseA).not.toHaveBeenCalled();
  });

  it('falls back to the next modal after the top one unmounts', () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const { rerender } = render(
      <>
        <Modal isOpen onClose={onCloseA} label="a" />
        <Modal isOpen onClose={onCloseB} label="b" />
      </>
    );
    rerender(
      <>
        <Modal isOpen onClose={onCloseA} label="a" />
        <Modal isOpen={false} onClose={onCloseB} label="b" />
      </>
    );
    pressEscape();
    expect(onCloseA).toHaveBeenCalledTimes(1);
    expect(onCloseB).not.toHaveBeenCalled();
  });
});
