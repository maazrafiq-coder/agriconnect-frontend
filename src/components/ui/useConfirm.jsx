// Replacement for window.confirm() on one-click admin actions that change what
// other people can do or see. `const [confirmNode, confirm] = useConfirm();`
// render {confirmNode} and call confirm({ title, description, consequences, danger,
// confirmLabel, successTitle, run }). `run` performs the action; failures stay in the dialog.
import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function useConfirm() {
  const [opts, setOpts] = useState(null);
  const node = opts ? (
    <ConfirmDialog
      title={opts.title}
      description={opts.description}
      consequences={opts.consequences}
      danger={!!opts.danger}
      confirmLabel={opts.confirmLabel || 'Confirm'}
      confirmingLabel={opts.confirmingLabel || 'Working…'}
      onConfirm={async () => { await opts.run(); }}
      success={opts.successTitle ? () => ({ title: opts.successTitle, message: opts.successMessage }) : undefined}
      onClose={() => setOpts(null)}
    />
  ) : null;
  return [node, setOpts];
}
