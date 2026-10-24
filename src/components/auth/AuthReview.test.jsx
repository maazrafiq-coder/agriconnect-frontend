import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', async (orig) => ({ ...(await orig()), apiRegister: vi.fn().mockResolvedValue({ identifier: '0300' }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ closeModal: vi.fn(), openLogin: vi.fn() }) }));
import { apiRegister } from '../../lib/api';
import { RegisterModal } from './AuthModals';

describe('registration review step', () => {
  it('shows a review (never the password) before anything is sent, then sends on confirm', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterModal /></MemoryRouter>);
    await user.type(screen.getByLabelText(/FULL NAME/), 'Ali Khan');
    await user.type(screen.getByLabelText(/^PHONE/), '03001234567');
    await user.type(screen.getByLabelText(/PASSWORD/), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(screen.getByText('Ali Khan')).toBeInTheDocument();
    expect(screen.queryByText(/Sup3rSecret/)).toBeNull();
    expect(apiRegister).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByLabelText(/FULL NAME/)).toHaveValue('Ali Khan');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: /Confirm & send code/ }));
    expect(apiRegister).toHaveBeenCalledTimes(1);
  });
});
