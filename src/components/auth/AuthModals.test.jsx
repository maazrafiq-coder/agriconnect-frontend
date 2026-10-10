import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  loginWithUser: vi.fn(), closeModal: vi.fn(), openRegister: vi.fn(), openForgot: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/api', async (orig) => ({ ...(await orig()), apiLogin: vi.fn() }));

import { apiLogin } from '../../lib/api';
import { LoginModal } from './AuthModals';

const setup = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<LoginModal />} />
      <Route path="/buyer" element={<div>BUYER PORTAL</div>} />
      <Route path="/seller" element={<div>SELLER PORTAL</div>} />
      <Route path="/admin" element={<div>ADMIN PORTAL</div>} />
    </Routes>
  </MemoryRouter>,
);
const fill = async (user) => {
  await user.type(screen.getByPlaceholderText(/0300-XXXXXXX/), '03001234567');
  await user.type(screen.getByPlaceholderText('Your password'), 'secret123');
};

describe('LoginModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('asks for both fields before calling the API', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /^login/i }));
    expect(screen.getByText(/Enter your phone\/email and password/)).toBeInTheDocument();
    expect(apiLogin).not.toHaveBeenCalled();
  });

  it('logs in, stores the adapted user and lands on the role portal', async () => {
    apiLogin.mockResolvedValue({ user: { id: 'u1', role: 'FARMER', phoneNumber: '0300', kycStatus: 'APPROVED', profile: { fullName: 'Ali' } } });
    const user = userEvent.setup();
    setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: /^login/i }));
    await waitFor(() => expect(screen.getByText('SELLER PORTAL')).toBeInTheDocument());
    expect(apiLogin).toHaveBeenCalledWith({ identifier: '03001234567', password: 'secret123' });
    expect(auth.loginWithUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', role: 'farmer', verified: true }));
    expect(auth.closeModal).toHaveBeenCalled();
  });

  it('routes admins to /admin and everyone else to /buyer', async () => {
    apiLogin.mockResolvedValue({ user: { id: 'a', role: 'ADMIN', profile: {} } });
    const user = userEvent.setup();
    setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: /^login/i }));
    await waitFor(() => expect(screen.getByText('ADMIN PORTAL')).toBeInTheDocument());
  });

  it('shows the server error and stays on the form when login fails', async () => {
    apiLogin.mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();
    setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: /^login/i }));
    expect(await screen.findByText(/Invalid credentials/)).toBeInTheDocument();
    expect(auth.loginWithUser).not.toHaveBeenCalled();
    expect(screen.queryByText('BUYER PORTAL')).toBeNull();
  });
});
