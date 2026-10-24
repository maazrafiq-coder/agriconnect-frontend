import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
let mockUser = { id: 'u1', role: 'trader', kycStatus: 'APPROVED' };

const api = vi.hoisted(() => ({
  apiGetNotifications: vi.fn(),
  apiGetUnreadNotificationCount: vi.fn(),
  apiMarkNotificationRead: vi.fn(),
  apiMarkAllNotificationsRead: vi.fn(),
}));
vi.mock('../lib/api', () => api);

import NotificationBell from './NotificationBell';
import { resolveNotificationTarget } from '../lib/deeplink';

const Where = () => { const l = useLocation(); return <div data-testid="where">{l.pathname}{l.search}</div>; };
const renderBell = () => render(
  <MemoryRouter initialEntries={['/marketplace']}>
    <NotificationBell />
    <Routes><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter>,
);

const declined = {
  id: 'n1', type: 'OFFER_REJECTED', title: 'Your offer was declined', body: 'The seller declined your offer on Basmati.', isRead: false, createdAt: new Date().toISOString(),
  data: { link: '/buyer?tab=offers&type=offer&id=offer-9', route: '/buyer', tab: 'offers', entityType: 'offer', entityId: 'offer-9' },
};

beforeEach(() => {
  mockUser = { id: 'u1', role: 'buyer', kycStatus: 'APPROVED' };
  Object.values(api).forEach(f => f.mockReset());
  api.apiGetUnreadNotificationCount.mockResolvedValue({ count: 1 });
  api.apiGetNotifications.mockResolvedValue([declined]);
  api.apiMarkNotificationRead.mockResolvedValue({});
});

describe('NotificationBell deep links', () => {
  it('a declined-offer notification opens the buyer portal on the Offers tab for that offer', async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByText('Your offer was declined'));
    expect(screen.getByTestId('where')).toHaveTextContent('/buyer?tab=offers&type=offer&id=offer-9');
    expect(api.apiMarkNotificationRead).toHaveBeenCalledWith('n1');
  });

  it('if marking read fails the item goes back to unread with a Retry (not silently lost)', async () => {
    api.apiMarkNotificationRead.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByText('Your offer was declined'));
    // panel closes on navigation; reopen to see the item state
    await user.click(await screen.findByRole('button', { name: /Notifications/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn.t mark as read/);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.apiMarkNotificationRead).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('a notification with no destination says so instead of doing nothing', async () => {
    api.apiGetNotifications.mockResolvedValue([{ ...declined, id: 'n2', data: null }]);
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByText('Your offer was declined'));
    expect(await screen.findByText(/no page to open/)).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/marketplace');
  });
});

describe('resolveNotificationTarget', () => {
  const seller = { role: 'trader' };
  const buyer = { role: 'buyer' };

  it('uses the structured destination', () => {
    expect(resolveNotificationTarget({ data: { route: '/seller', tab: 'offers', entityType: 'offer', entityId: 'o1' } }, seller)).toBe('/seller?tab=offers&type=offer&id=o1');
  });
  it('understands an old notification that only has link + offerId', () => {
    expect(resolveNotificationTarget({ data: { link: '/buyer', offerId: 'o2' } }, buyer)).toBe('/buyer?type=offer&id=o2');
    expect(resolveNotificationTarget({ data: { link: '/transport-portal', requestId: 't1' } }, { role: 'transporter' })).toBe('/transport-portal?type=transport&id=t1');
  });
  it('sends a user to their own portal instead of a page they cannot open', () => {
    expect(resolveNotificationTarget({ data: { route: '/seller', tab: 'offers' } }, buyer)).toBe('/buyer');
    expect(resolveNotificationTarget({ data: { route: '/admin' } }, buyer)).toBe('/buyer');
    expect(resolveNotificationTarget({ data: { route: '/warehouse-portal', tab: 'gateout' } }, { role: 'warehouse' })).toBe('/warehouse-portal?tab=gateout');
  });
  it('returns null (never a broken URL) when there is no destination', () => {
    expect(resolveNotificationTarget({ data: null }, buyer)).toBeNull();
    expect(resolveNotificationTarget({ data: { link: 'javascript:alert(1)' } }, buyer)).toBeNull();
    expect(resolveNotificationTarget({ data: { link: '//evil.example' } }, buyer)).toBeNull();
  });
});
