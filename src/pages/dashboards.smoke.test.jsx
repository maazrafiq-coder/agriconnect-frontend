// Smoke tests for the pages that were split into components in M8: each one
// must mount against an empty backend and survive switching through every tab
// (a mis-wired prop on an extracted tab would throw during render).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ user: { id: 'u1', role: 'admin', name: 'Test User', email: 't@x.pk' }, logout: vi.fn(), openLogin: vi.fn(), openRegister: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../lib/api', async (orig) => (await import('../test/stubApi')).stubApi(await orig(), {}));

import SellerDashboard from './SellerDashboard';
import WarehousePage from './WarehousePage';
import AdminDashboard from './AdminDashboard';
import WarehouseOperatorDashboard from './WarehouseOperatorDashboard';
import AccountPage from './AccountPage';

const mount = (el) => render(<MemoryRouter>{el}</MemoryRouter>);
async function clickThrough(labels) {
  const user = userEvent.setup();
  for (const label of labels) {
    await waitFor(() => expect(screen.queryAllByRole('tab').length + screen.queryAllByRole('button').length).toBeGreaterThan(0));
    const btn = [...screen.queryAllByRole('tab'), ...screen.queryAllByRole('button')].find(b => label.test(b.textContent));
    expect(btn, `tab ${label}`).toBeTruthy();
    await user.click(btn);
  }
}

describe('split pages still render and switch tabs', () => {
  it('SellerDashboard', async () => {
    auth.user = { id: 's1', role: 'trader', name: 'Seller' };
    mount(<SellerDashboard />);
    await clickThrough([/Listings/, /Offers/, /Orders/, /Warehouse/, /Messages/, /Overview/]);
  });
  it('WarehousePage', async () => {
    auth.user = { id: 'b1', role: 'buyer', name: 'Buyer' };
    mount(<WarehousePage />);
    await clickThrough([/My Bookings/, /My Receipts/, /How It Works/, /Browse Warehouses/]);
  });
  it('AdminDashboard', async () => {
    auth.user = { id: 'a1', role: 'admin', name: 'Admin' };
    mount(<AdminDashboard />);
    await clickThrough([/Users/, /Marketplace/, /Payments/, /Logistics/, /Loan Applications/, /Settings/, /Audit Log/, /Dashboard/]);
  });
  it('WarehouseOperatorDashboard', async () => {
    auth.user = { id: 'w1', role: 'warehouse', name: 'Operator' };
    mount(<WarehouseOperatorDashboard />);
    // with no warehouse profile the operator sees the registration form
    await waitFor(() => expect(screen.queryAllByRole('button').length).toBeGreaterThan(0));
  });
  it('AccountPage', async () => {
    auth.user = { id: 'u1', role: 'buyer', name: 'User' };
    mount(<AccountPage />);
    await clickThrough([/Edit Profile/, /Password/, /Documents/, /Activity Log/, /Danger Zone/, /Profile/]);
  });
});
