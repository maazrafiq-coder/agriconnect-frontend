// Read-only terms: a one-line summary plus the instalments for an order total.
// `schedule` from the server (with real due dates) wins over the local rule-only preview.
import T from '../theme';
import { describeTerms, scheduleFor, money } from '../lib/paymentTerms';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function PaymentTermsView({ terms, total, schedule, compact = false }) {
  const rows = schedule || (terms ? scheduleFor(terms, total) : []);
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: T.text }}>{describeTerms(terms)}</div>
      {rows === null && <div style={{ color: T.danger, marginTop: 4 }}>The advance must be less than the order total.</div>}
      {!compact && rows?.length > 0 && Number(total) > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: i ? `1px solid ${T.border}` : 'none' }}>
                <td style={{ padding: '4px 0' }}>{r.label}</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>{money(r.amount)}</td>
                <td style={{ padding: '4px 0 4px 10px', color: T.muted }}>
                  {r.dueDate ? `due ${fmtDate(r.dueDate)}` : r.dueRule}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
