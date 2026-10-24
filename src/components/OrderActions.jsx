import { useState } from 'react';
import { Btn } from './ui';
import TextPromptModal from './ui/TextPromptModal';
import ConfirmDialog from './ui/ConfirmDialog';
import { apiUpdateOrderStatus } from '../lib/api';
import T from '../theme';

// Which moves each party may make from each order status. This mirrors the
// backend state machine (ORDER_TRANSITIONS in offers.service.ts) — the
// server is the authority; this only decides which buttons to show.
//   [target status, label, button variant, needs a written reason?]
const ACTIONS = {
  seller: {
    confirmed:  [['IN_TRANSIT', 'Mark In Transit', 'primary'], ['CANCELLED', 'Cancel order', 'ghost', true], ['DISPUTED', 'Raise dispute', 'ghost', true]],
    in_transit: [['DISPUTED', 'Raise dispute', 'ghost', true]],
    delivered:  [['DISPUTED', 'Raise dispute', 'ghost', true]],
  },
  buyer: {
    confirmed:  [['CANCELLED', 'Cancel order', 'ghost', true], ['DISPUTED', 'Raise dispute', 'ghost', true]],
    in_transit: [['DELIVERED', 'Confirm Delivery', 'primary'], ['DISPUTED', 'Raise dispute', 'ghost', true]],
    delivered:  [['COMPLETED', 'Complete Order', 'primary'], ['DISPUTED', 'Raise dispute', 'ghost', true]],
  },
};

const CONFIRM = {
  IN_TRANSIT: 'Mark this order as shipped / in transit?',
  DELIVERED: 'Confirm that you have received the goods?',
  COMPLETED: 'Complete this order? This closes it as successfully fulfilled.',
};

const REASON_COPY = {
  CANCELLED: { title: 'Cancel order', label: 'Reason for cancelling', submit: 'Cancel order', description: 'The other party will see this reason, and the quantity goes back on the listing.' },
  DISPUTED:  { title: 'Raise a dispute', label: 'What went wrong?', submit: 'Raise dispute', description: 'An admin will review the dispute and resolve it. The order is frozen until then.' },
};

// order: adapted order (lowercase .status, ._raw.id); role: 'seller' | 'buyer'
export default function OrderActions({ order, role, onChanged }) {
  const [prompt, setPrompt] = useState(null); // target status needing a reason
  const [confirming, setConfirming] = useState(null); // [status, label]
  const busy = false;
  const [error, setError] = useState('');

  const orderId = order._raw?.id || order.id;

  if (order.status === 'disputed') {
    return <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 700 }}>⚖️ Under dispute — an admin will review it</span>;
  }
  const actions = ACTIONS[role]?.[order.status] || [];
  if (!actions.length) return null;

  const run = async (status, note) => {
    await apiUpdateOrderStatus(orderId, status, note);
    onChanged?.();
  };

  const a_label = (st) => actions.find(a => a[0] === st)?.[1] || 'Confirm';
  const click = ([status, , , needsReason]) => {
    setError('');
    if (needsReason) { setPrompt(status); return; }
    setConfirming([status, a_label(status)]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {actions.map(a => (
          <Btn key={a[0]} variant={a[2]} size="sm" disabled={busy} onClick={() => click(a)}>{a[1]}</Btn>
        ))}
      </div>
      {error && <div style={{ fontSize: 11, color: T.danger, maxWidth: 260, textAlign: 'right' }}>{error}</div>}
      {confirming && (
        <ConfirmDialog
          title={confirming[1]}
          description={CONFIRM[confirming[0]]}
          confirmLabel={confirming[1]}
          onConfirm={() => run(confirming[0])}
          onClose={() => setConfirming(null)}
        />
      )}
      {prompt && (
        <TextPromptModal
          title={REASON_COPY[prompt].title}
          description={REASON_COPY[prompt].description}
          label={REASON_COPY[prompt].label}
          submitLabel={REASON_COPY[prompt].submit}
          onSubmit={(text) => run(prompt, text)}
          onClose={() => setPrompt(null)}
        />
      )}
    </div>
  );
}
