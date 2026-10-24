import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClarificationThread from './ClarificationThread';

vi.mock('../lib/api', () => ({ apiGetClarificationAttachmentUrl: vi.fn(), resolveApiFileUrl: (u) => u }));

const thread = (over = {}) => ({
  id: 'c1', status: 'OPEN', createdAt: '2026-10-01T09:00:00Z', requestMessage: 'Please upload your CNIC',
  messages: [
    { id: 'm1', senderRole: 'REVIEWER', senderName: 'Admin Sara', body: 'Please upload your CNIC', createdAt: '2026-10-01T09:00:00Z', attachments: [] },
  ],
  ...over,
});

describe('ClarificationThread', () => {
  it('shows both sides in chronological order with sender names', () => {
    const c = thread({
      status: 'RESPONDED',
      messages: [
        { id: 'm2', senderRole: 'SUBJECT', senderName: 'Ali', body: 'Uploaded just now', createdAt: '2026-10-01T10:00:00Z', attachments: [] },
        { id: 'm1', senderRole: 'REVIEWER', senderName: 'Admin Sara', body: 'Please upload your CNIC', createdAt: '2026-10-01T09:00:00Z', attachments: [] },
      ],
    });
    render(<ClarificationThread clarifications={[c]} viewerRole="subject" onRespond={vi.fn()} />);
    const log = screen.getByRole('log');
    const text = log.textContent;
    expect(text.indexOf('Please upload your CNIC')).toBeLessThan(text.indexOf('Uploaded just now'));
    expect(within(log).getByText(/^You ·/)).toBeInTheDocument();
    expect(within(log).getByText(/Admin Sara/)).toBeInTheDocument();
  });

  it('the sender sees their reply in the thread right after the server confirmed it, then it is not duplicated by the re-fetched list', async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn().mockResolvedValue({}); // server confirmed, list not re-fetched yet
    const { rerender } = render(<ClarificationThread clarifications={[thread()]} viewerRole="subject" onRespond={onRespond} />);
    await user.type(screen.getByLabelText('Your message'), 'Here is the clearer photo');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    expect(await screen.findByText('Here is the clearer photo')).toBeInTheDocument();
    expect(screen.getByText(/✓ Sent/)).toBeInTheDocument();
    expect(screen.getByLabelText('Your message')).toHaveValue('');

    const reqId = onRespond.mock.calls[0][3];
    expect(reqId).toBeTruthy();
    // the page re-fetches and now the server copy carries the same request id
    rerender(<ClarificationThread viewerRole="subject" onRespond={onRespond} clarifications={[thread({ status: 'RESPONDED', messages: [
      ...thread().messages,
      { id: 'm2', clientRequestId: reqId, senderRole: 'SUBJECT', body: 'Here is the clearer photo', createdAt: new Date().toISOString(), attachments: [] },
    ] })]} />);
    expect(screen.getAllByText('Here is the clearer photo')).toHaveLength(1);
  });

  it('double-click sends once; both attempts would carry the same idempotency key', async () => {
    const user = userEvent.setup();
    let resolve;
    const onRespond = vi.fn(() => new Promise(r => { resolve = r; }));
    render(<ClarificationThread clarifications={[thread()]} viewerRole="subject" onRespond={onRespond} />);
    await user.type(screen.getByLabelText('Your message'), 'hello there');
    await user.dblClick(screen.getByRole('button', { name: /Send Response/ }));
    expect(onRespond).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({}); });
  });

  it('a failed send keeps the text and reuses the SAME key on retry (so a lost reply cannot create a duplicate)', async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Network problem — please check your connection and try again.'), { isNetwork: true }))
      .mockResolvedValueOnce({});
    render(<ClarificationThread clarifications={[thread()]} viewerRole="subject" onRespond={onRespond} />);
    await user.type(screen.getByLabelText('Your message'), 'my answer');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i);
    expect(screen.getByLabelText('Your message')).toHaveValue('my answer');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    expect(await screen.findByText(/✓ Sent/)).toBeInTheDocument();
    expect(onRespond.mock.calls[0][3]).toBe(onRespond.mock.calls[1][3]);
  });

  it('editing the text after a failure starts a new send intent (new key)', async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({});
    render(<ClarificationThread clarifications={[thread()]} viewerRole="subject" onRespond={onRespond} />);
    await user.type(screen.getByLabelText('Your message'), 'first');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    await screen.findByRole('alert');
    await user.type(screen.getByLabelText('Your message'), ' edited');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    await screen.findByText(/✓ Sent/);
    expect(onRespond.mock.calls[0][3]).not.toBe(onRespond.mock.calls[1][3]);
  });

  it('an expired session is reported as such, not as a generic failure', async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    render(<ClarificationThread clarifications={[thread()]} viewerRole="subject" onRespond={onRespond} />);
    await user.type(screen.getByLabelText('Your message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send Response' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/session has expired/i);
    expect(screen.getByLabelText('Your message')).toHaveValue('hello');
  });

  it('a user can reply again after RESPONDED, and no reply box on a RESOLVED thread', () => {
    const { rerender } = render(<ClarificationThread clarifications={[thread({ status: 'RESPONDED' })]} viewerRole="subject" onRespond={vi.fn()} />);
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
    rerender(<ClarificationThread clarifications={[thread({ status: 'RESOLVED' })]} viewerRole="subject" onRespond={vi.fn()} />);
    expect(screen.queryByLabelText('Your message')).toBeNull();
  });

  it('reviewer sees the same history, with resolve offered once the applicant replied', async () => {
    const onResolve = vi.fn();
    const c = thread({ status: 'RESPONDED', messages: [...thread().messages, { id: 'm2', senderRole: 'SUBJECT', senderName: 'Ali', body: 'done', createdAt: '2026-10-01T10:00:00Z', attachments: [] }] });
    render(<ClarificationThread clarifications={[c]} viewerRole="reviewer" onRespond={vi.fn()} onResolve={onResolve} />);
    expect(screen.getByText('Applicant replied')).toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    expect(onResolve).toHaveBeenCalledWith('c1');
  });

  it('still renders an old-format row (requestMessage/responseMessage only) as a conversation', () => {
    const legacy = { id: 'c9', status: 'RESPONDED', createdAt: '2026-10-01T09:00:00Z', requestMessage: 'old question', responseMessage: 'old answer', respondedAt: '2026-10-02T09:00:00Z' };
    render(<ClarificationThread clarifications={[legacy]} viewerRole="subject" onRespond={vi.fn()} />);
    expect(screen.getByText('old question')).toBeInTheDocument();
    expect(screen.getByText('old answer')).toBeInTheDocument();
  });
});
