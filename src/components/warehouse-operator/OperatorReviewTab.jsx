import { Card } from '../ui';
import ClarificationThread from '../ClarificationThread';
import T from '../../theme';

// ─── OperatorReviewTab ───
export function OperatorReviewTab({ clarifications, handleRespondToClarification }) {
  return (
    clarifications.length === 0 ? (
      <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No open questions from AgriConnect about your listing right now.</p></Card>
    ) : (
      <ClarificationThread
        clarifications={clarifications}
        viewerRole="subject"
        onRespond={handleRespondToClarification}
      />
    )
  );
}
