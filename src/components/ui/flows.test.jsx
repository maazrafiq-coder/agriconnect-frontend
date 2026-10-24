import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestFlowModal, ConfirmDialog } from './index';

function Harness({ onSubmit, onDone, onClose = () => {}, success }) {
  const [qty, setQty] = useState('');
  return (
    <RequestFlowModal
      title="Send request"
      form={<label>Quantity<input value={qty} onChange={e => setQty(e.target.value)} /></label>}
      canReview={!!qty}
      summaryRows={[{ label: 'Quantity', value: `${qty} tons` }, { label: 'Empty', value: '' }]}
      reviewNotice="No payment is taken now."
      confirmLabel="Send Request"
      onSubmit={onSubmit}
      success={success || ((r) => ({ title: 'Request sent', reference: r?.ref, rows: [{ label: 'Quantity', value: `${qty} tons` }], status: 'Requested', nextSteps: ['They will reply soon'] }))}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

describe('RequestFlowModal', () => {
  it('goes form → review (with every value) → success, and Back keeps what was typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ref: 'REQ-2026-000001' });
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: /Review/ })).toBeDisabled();
    await user.type(screen.getByLabelText('Quantity'), '50');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(screen.getByText('50 tons')).toBeInTheDocument();
    expect(screen.getByText('No payment is taken now.')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).toBeNull(); // blank values are not shown as rows
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByLabelText('Quantity')).toHaveValue('50');

    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(screen.getByText(/REQ-2026-000001/)).toBeInTheDocument();
    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getByText('They will reply soon')).toBeInTheDocument();
  });

  it('never shows success or a reference before the server answered, and never invents a reference', async () => {
    const user = userEvent.setup();
    let resolve;
    const onSubmit = vi.fn(() => new Promise(r => { resolve = r; }));
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.queryByText('Request sent')).toBeNull();
    expect(screen.getByRole('button', { name: /Submitting/ })).toBeDisabled();
    await act(async () => { resolve({}); }); // server returned no reference
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(screen.queryByText(/REQ-/)).toBeNull();
  });

  it('a fast double-click submits exactly once', async () => {
    const user = userEvent.setup();
    let resolve;
    const onSubmit = vi.fn(() => new Promise(r => { resolve = r; }));
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    const btn = screen.getByRole('button', { name: 'Send Request' });
    await user.dblClick(btn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ ref: 'X' }); });
  });

  it('a failure keeps the review and the typed input, shows the message, and allows a retry', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Quantity exceeds capacity'), { status: 400 }))
      .mockResolvedValueOnce({ ref: 'R2' });
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Quantity'), '999');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Quantity exceeds capacity');
    expect(screen.queryByText('Request sent')).toBeNull();
    expect(screen.getByText('999 tons')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('tells an expired session apart from a network failure', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    render(<RequestFlowModal title="t" form={<span>f</span>} summaryRows={[{ label: 'a', value: 'b' }]} onSubmit={onSubmit} success={{}} onClose={() => {}} onLogin={onLogin} />);
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/session has expired/i);
    await user.click(screen.getByRole('button', { name: 'Log In' }));
    expect(onLogin).toHaveBeenCalled();
  });

  it('Done closes the flow and does not submit again', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ref: 'R' });
    const onDone = vi.fn();
    render(<Harness onSubmit={onSubmit} onDone={onDone} />);
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    await user.click(await screen.findByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed with Escape while the request is in flight', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let resolve;
    const onSubmit = vi.fn(() => new Promise(r => { resolve = r; }));
    render(<Harness onSubmit={onSubmit} onClose={onClose} />);
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { resolve({}); });
  });

  it('runs validate() before moving to review and shows the problem inline', async () => {
    const user = userEvent.setup();
    render(<RequestFlowModal title="t" form={<span>f</span>} validate={() => 'Pickup date must be in the future'} summaryRows={[]} onSubmit={vi.fn()} success={{}} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pickup date must be in the future');
    expect(screen.queryByRole('button', { name: /Back/ })).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('shows consequences, requires a reason when asked, then confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    render(<ConfirmDialog title="Reject release" danger consequences={['The depositor is notified']} reasonLabel="Reason" reasonRequired confirmLabel="Reject" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByText('The depositor is notified')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Reason is required');
    expect(onConfirm).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), 'Documents missing');
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ reason: 'Documents missing', state: {} }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('keeps the input and shows the error when the action fails', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('Already processed'));
    const onClose = vi.fn();
    render(<ConfirmDialog title="Cancel" reasonLabel="Reason" confirmLabel="Yes" onConfirm={onConfirm} onClose={onClose} />);
    await user.type(screen.getByLabelText(/Reason/), 'changed my mind');
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Already processed');
    expect(screen.getByLabelText(/Reason/)).toHaveValue('changed my mind');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a success screen with Done when asked to', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ConfirmDialog title="Cancel" confirmLabel="Yes" onConfirm={vi.fn().mockResolvedValue({ n: 1 })} success={() => ({ title: 'Cancelled', message: 'No charge was made.' })} onClose={() => {}} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('double-click confirms once', async () => {
    const user = userEvent.setup();
    let resolve;
    const onConfirm = vi.fn(() => new Promise(r => { resolve = r; }));
    render(<ConfirmDialog title="x" confirmLabel="Go" onConfirm={onConfirm} onClose={() => {}} />);
    await user.dblClick(screen.getByRole('button', { name: 'Go' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({}); });
  });
});
