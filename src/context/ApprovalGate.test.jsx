import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

let mockAuth;
vi.mock('./AuthContext', () => ({ useAuth: () => mockAuth }));
import { ApprovalGateProvider, useApprovalGate } from './ApprovalGate';

function Probe({ onGo }) {
  const gate = useApprovalGate();
  return <button onClick={gate(onGo, 'make an offer')}>Make an offer</button>;
}
const setup = (user, onGo = vi.fn()) => {
  mockAuth = { user, openLogin: vi.fn() };
  render(<MemoryRouter><ApprovalGateProvider><Probe onGo={onGo} /></ApprovalGateProvider></MemoryRouter>);
  return { onGo, auth: mockAuth };
};

describe('approval gate', () => {
  it('approved users proceed', async () => {
    const { onGo } = setup({ kycStatus: 'APPROVED' });
    await userEvent.click(screen.getByRole('button', { name: 'Make an offer' }));
    expect(onGo).toHaveBeenCalled();
  });
  it('guests are sent to log in, not shown an approval message', async () => {
    const { onGo, auth } = setup(null);
    await userEvent.click(screen.getByRole('button', { name: 'Make an offer' }));
    expect(auth.openLogin).toHaveBeenCalled();
    expect(onGo).not.toHaveBeenCalled();
  });
  it('a user waiting for approval gets an explanation instead of the action', async () => {
    const { onGo } = setup({ kycStatus: 'SUBMITTED' });
    await userEvent.click(screen.getByRole('button', { name: 'Make an offer' }));
    expect(onGo).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Approval needed' })).toBeInTheDocument();
    expect(screen.getByText(/can't make an offer yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View my verification status/ })).toBeInTheDocument();
  });
  it('a rejected user is told what to do next', async () => {
    setup({ kycStatus: 'REJECTED' });
    await userEvent.click(screen.getByRole('button', { name: 'Make an offer' }));
    expect(screen.getByText(/was not approved/)).toBeInTheDocument();
  });
});
