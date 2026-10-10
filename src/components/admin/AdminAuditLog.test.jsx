import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', async (orig) => ({ ...(await orig()), apiAdminGetAuditLog: vi.fn() }));
import { apiAdminGetAuditLog } from '../../lib/api';
import AdminAuditLog from './AdminAuditLog';

const row = (i, extra = {}) => ({ id: `r${i}`, createdAt: '2026-10-01T10:00:00Z', action: 'kyc_approved', entityType: 'User', entityId: `entity-${i}-abcdef`, actor: { name: 'Sara', role: 'ADMIN' }, details: { note: 'ok' }, ...extra });

describe('AdminAuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the first page and renders readable rows', async () => {
    apiAdminGetAuditLog.mockResolvedValue({ data: [row(1)], meta: { total: 1, page: 1, totalPages: 1 } });
    render(<AdminAuditLog />);
    expect(await screen.findByText('kyc approved')).toBeInTheDocument();
    expect(screen.getByText(/Sara/)).toBeInTheDocument();
    expect(apiAdminGetAuditLog).toHaveBeenCalledWith({ action: undefined, page: 1, limit: 25 });
    expect(screen.getByText('1 entries')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    apiAdminGetAuditLog.mockResolvedValue({ data: [], meta: { total: 0, page: 1, totalPages: 1 } });
    render(<AdminAuditLog />);
    expect(await screen.findByText('No entries yet.')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    apiAdminGetAuditLog.mockRejectedValue(new Error('boom'));
    render(<AdminAuditLog />);
    expect(await screen.findByText('Could not load the audit log.')).toBeInTheDocument();
  });

  it('filters by action', async () => {
    apiAdminGetAuditLog.mockResolvedValue({ data: [row(1)], meta: { total: 1, page: 1, totalPages: 1 } });
    const user = userEvent.setup();
    render(<AdminAuditLog />);
    await screen.findByText('kyc approved');
    await user.type(screen.getByPlaceholderText(/Filter by action/), ' lien_confirmed ');
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => expect(apiAdminGetAuditLog).toHaveBeenLastCalledWith({ action: 'lien_confirmed', page: 1, limit: 25 }));
  });
});
