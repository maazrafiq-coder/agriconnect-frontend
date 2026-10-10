import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Btn, Modal, MetricPill, Tabs } from './index';

describe('MetricPill', () => {
  it('shows "Not provided" instead of a fake "Good" when the value is missing', () => {
    render(<MetricPill label="Moisture" val="—" ok={false} />);
    expect(screen.getByText('Not provided')).toBeInTheDocument();
    expect(screen.queryByText(/Good|Within/)).toBeNull();
  });
  it('flags a real value outside the range', () => {
    render(<MetricPill label="Moisture" val="18%" ok={false} />);
    expect(screen.getByText(/Check/)).toBeInTheDocument();
  });
});

describe('Btn', () => {
  it('defaults to type=button (never submits a surrounding form) and passes extra props', () => {
    render(<Btn title="why disabled">Go</Btn>);
    const b = screen.getByRole('button', { name: 'Go' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b).toHaveAttribute('title', 'why disabled');
  });
});

describe('Modal', () => {
  it('is an accessible dialog that closes on Escape and via the labelled close button', () => {
    const onClose = vi.fn();
    render(<Modal title="Edit thing" onClose={onClose}><p>body</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('ignores backdrop clicks unless closeOnBackdrop is set', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="x" onClose={onClose}>b</Modal>);
    fireEvent.click(container.firstChild);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Tabs accessibility', () => {
  const tabs = [['a', 'Alpha'], ['b', 'Beta'], ['c', 'Gamma']];
  it('exposes tablist/tab roles with aria-selected and a roving tabindex', () => {
    render(<Tabs tabs={tabs} active="b" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const [a, b] = screen.getAllByRole('tab');
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(a).toHaveAttribute('aria-selected', 'false');
    expect(b).toHaveAttribute('tabindex', '0');
    expect(a).toHaveAttribute('tabindex', '-1');
  });
  it('arrow keys, Home and End change the selected tab (wrapping)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} active="c" onChange={onChange} />);
    screen.getByRole('tab', { name: 'Gamma' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });
});

describe('Modal focus management', () => {
  it('moves focus in, traps Tab, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          {open && <Modal title="Edit thing" onClose={() => { onClose(); setOpen(false); }}><input aria-label="first" /><button>second</button></Modal>}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByText('open');
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Edit thing' });
    expect(dialog).toContainElement(document.activeElement);
    expect(screen.getByLabelText('first')).toHaveFocus();
    await user.tab(); await user.tab(); await user.tab(); // close, then second, then wraps
    expect(dialog).toContainElement(document.activeElement);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(opener).toHaveFocus();
  });
});
