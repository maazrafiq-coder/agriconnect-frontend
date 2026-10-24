import { Btn } from './ui';

// Shown when a notification pointed at a record that can't be found.
export default function DeepLinkNotice({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div role="status" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <span>ℹ️ {notice.message}</span>
      <Btn size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Btn>
    </div>
  );
}
