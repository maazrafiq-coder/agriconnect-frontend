import { Card, LoadingState } from '../ui';
import T from '../../theme';
import { fmtDate } from './shared';

export function actionLabel(action) {
  if (!action) return 'Activity';
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── ACTIVITY LOG TAB ───────────────────────────────────────────────────────
export const ActivityTab = ({ activity, loading }) => {
  if (loading) return <LoadingState label="Loading activity…" />;
  if (!activity.length) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No recorded activity yet.</p>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {activity.map((log, i) => (
        <div key={log.id} style={{
          padding: '13px 18px',
          borderBottom: i < activity.length - 1 ? `1px solid ${T.border}` : 'none',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{actionLabel(log.action)}</div>
            {(log.entityType || log.details) && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {log.entityType ? `${log.entityType}${log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}` : ''}
                {log.details ? (log.entityType ? ' · ' : '') + JSON.stringify(log.details).slice(0, 80) : ''}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</div>
        </div>
      ))}
    </Card>
  );
};
