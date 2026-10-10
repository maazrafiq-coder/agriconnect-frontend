import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../lib/api', async (orig) => ({ ...(await orig()), apiChangePassword: vi.fn() }));
import { apiChangePassword } from '../lib/api';
import { ChangePasswordTab } from './account/ChangePasswordTab';

describe('form submit buttons', () => {
  it('Update Password submits the form when clicked (Btn defaults to type=button)', async () => {
    apiChangePassword.mockResolvedValue({});
    const onDone = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordTab onDone={onDone} />);
    const [cur, next, confirm] = container.querySelectorAll('input[type=password]');
    await user.type(cur, 'oldpass123');
    await user.type(next, 'newpass1234');
    await user.type(confirm, 'newpass1234');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));
    await waitFor(() => expect(apiChangePassword).toHaveBeenCalledWith({ currentPassword: 'oldpass123', newPassword: 'newpass1234' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('rejects mismatching passwords without calling the API', async () => {
    apiChangePassword.mockClear();
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordTab onDone={() => {}} />);
    const [cur, next, confirm] = container.querySelectorAll('input[type=password]');
    await user.type(cur, 'oldpass123');
    await user.type(next, 'newpass1234');
    await user.type(confirm, 'different123');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByText('New passwords do not match.')).toBeInTheDocument();
    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  // Guard against the M6 regression: every <form> must contain an explicit submit control.
  it('every <form> in the source has a type="submit" control', () => {
    const root = join(__dirname, '..');
    const files = [];
    const walk = (d) => readdirSync(d).forEach(f => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.jsx$/.test(f) && !/\.test\./.test(f)) files.push(p);
    });
    walk(root);
    const offenders = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const forms = src.match(/<form[\s>][\s\S]*?<\/form>/g) || [];
      for (const block of forms) if (!/type="submit"/.test(block)) offenders.push(f.replace(root, 'src'));
    }
    expect(offenders).toEqual([]);
  });
});
