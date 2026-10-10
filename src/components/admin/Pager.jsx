import { Btn } from '../ui';
import T from '../../theme';

export const Pager = ({ page, totalPages, total, onPage, busy }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 4px', fontSize: 12, color: T.muted, flexWrap: 'wrap' }}>
    <span>{total} total{busy ? ' · loading…' : ''}</span>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Btn variant="ghost" size="sm" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>← Prev</Btn>
      <span>Page {page} of {Math.max(totalPages, 1)}</span>
      <Btn variant="ghost" size="sm" disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>Next →</Btn>
    </span>
  </div>
);
