// src/components/ui/RequestFlowModal.jsx
//
// The one request → review → confirm → success experience used across
// AgriConnect (modelled on the warehouse BookingModal).
//
//   1. FORM     - the parent renders its fields (`form`) and owns their state, so
//                 pressing Back from the review never loses what was typed.
//   2. REVIEW   - every important value in `summaryRows` (or a custom `review`
//                 node), plus an optional notice spelling out the consequences.
//   3. SUCCESS  - only after the server confirmed. Shows the server-generated
//                 reference (never an invented one), a summary, the real status,
//                 next steps and a single primary Done button.
//
// Guarantees:
//   * success is never shown before onSubmit resolved;
//   * a failure keeps the form + review and shows a readable error
//     (auth / permission / network are told apart, see lib/errors.js);
//   * the confirm button locks synchronously (a ref, not just state), so a
//     fast double-click cannot send twice;
//   * Done / the close button never re-submit;
//   * the dialog cannot be dismissed while a request is in flight.
import { useRef, useState, useEffect } from 'react';
import T from '../../theme';
import { Modal, Btn, InfoRow } from './index';
import { describeError } from '../../lib/errors';

const FLOW_STEPS = { form: 0, review: 1, success: 2 };

export function FlowProgress({ labels, current }) {
  return (
    <ol aria-label="Progress" style={{ display: 'flex', gap: 4, margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
      {labels.map((label, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? T.teal : active ? T.green : '#D1D5DB', color: done || active ? '#fff' : '#6B7280', fontSize: 11, fontWeight: 700, margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {done ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, color: active ? T.green : T.muted, fontWeight: active ? 700 : 400 }}>{label}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function FlowError({ error, onLogin }) {
  if (!error) return null;
  return (
    <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', margin: '0 0 14px', fontSize: 12, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span>⚠ {error.message}</span>
      {error.kind === 'auth' && onLogin && (
        <button type="button" onClick={onLogin} style={{ background: '#B91C1C', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Log In</button>
      )}
    </div>
  );
}

export function SummaryRows({ rows }) {
  return (
    <div>
      {(rows || []).filter(r => r && r.value !== undefined && r.value !== null && r.value !== '').map(r => (
        <InfoRow key={r.label} label={r.label} value={r.value} accent={r.accent} />
      ))}
    </div>
  );
}

export default function RequestFlowModal({
  title,
  stepLabels = ['Details', 'Review', 'Done'],
  form,
  canReview = true,
  validate,
  reviewLabel = 'Review →',
  reviewTitle = 'Please review before sending',
  reviewNotice,
  summaryRows,
  review,
  confirmLabel = 'Submit',
  confirmingLabel = 'Submitting…',
  confirmVariant = 'primary',
  onSubmit,
  success,
  onClose,
  onDone,
  onLogin,
  width = 520,
}) {
  const [step, setStep] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const lock = useRef(false);
  const headingRef = useRef(null);

  // Move focus to the step heading when the step changes (keyboard / screen reader users).
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const guardedClose = () => { if (!lock.current) onClose?.(); };

  const goReview = () => {
    const problem = validate ? validate() : null;
    if (problem) { setError({ kind: 'validation', message: problem }); return; }
    setError(null);
    setStep('review');
  };

  const confirm = async () => {
    if (lock.current) return; // synchronous guard against double-clicks
    lock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit();
      setResult(res ?? {});
      setStep('success');
    } catch (e) {
      setError(describeError(e)); // stay on the review step with everything intact
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  };

  const current = FLOW_STEPS[step];
  const heading = { fontSize: 14, fontWeight: 800, color: T.green, margin: '0 0 12px', outline: 'none' };

  if (step === 'success') {
    const s = (typeof success === 'function' ? success(result) : success) || {};
    return (
      <Modal title={s.modalTitle || title} onClose={onClose} width={width}>
        <FlowProgress labels={stepLabels} current={3} />
        <div role="status" style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div aria-hidden="true" style={{ fontSize: 52, marginBottom: 12 }}>{s.icon || '✅'}</div>
          <h3 ref={headingRef} tabIndex={-1} style={{ color: T.green, margin: '0 0 8px', outline: 'none' }}>{s.title || 'Done'}</h3>
          {s.reference && (
            <div style={{ display: 'inline-block', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 10, letterSpacing: 0.3 }}>
              {s.referenceLabel ? `${s.referenceLabel}: ` : ''}{s.reference}
            </div>
          )}
          {s.message && <p style={{ color: T.muted, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>{s.message}</p>}
          {(s.rows?.length || s.status) && (
            <div style={{ background: T.surface, borderRadius: 10, padding: 14, margin: '0 0 16px', textAlign: 'left' }}>
              <SummaryRows rows={[...(s.rows || []), s.status ? { label: 'Status', value: s.status } : null]} />
            </div>
          )}
          {!!s.nextSteps?.length && (
            <div style={{ textAlign: 'left', margin: '0 0 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 6 }}>WHAT HAPPENS NEXT</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: T.text, lineHeight: 1.7 }}>
                {s.nextSteps.map(n => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {s.secondary && <Btn variant="ghost" onClick={s.secondary.onClick}>{s.secondary.label}</Btn>}
            <Btn variant="primary" onClick={onDone || onClose}>Done</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={guardedClose} width={width}>
      <FlowProgress labels={stepLabels} current={current} />

      {step === 'form' && (
        <>
          <h4 ref={headingRef} tabIndex={-1} style={{ ...heading, position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{stepLabels[0]}</h4>
          {form}
          <FlowError error={error} onLogin={onLogin} />
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} disabled={!canReview} onClick={goReview}>{reviewLabel}</Btn>
        </>
      )}

      {step === 'review' && (
        <>
          <h4 ref={headingRef} tabIndex={-1} style={heading}>{reviewTitle}</h4>
          {reviewNotice && (
            <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>{reviewNotice}</div>
          )}
          <div style={{ marginBottom: 16 }}>{review || <SummaryRows rows={summaryRows} />}</div>
          <FlowError error={error} onLogin={onLogin} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setError(null); setStep('form'); }} disabled={submitting}>← Back</Btn>
            <Btn variant={confirmVariant} onClick={confirm} disabled={submitting} aria-busy={submitting}>{submitting ? confirmingLabel : confirmLabel}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
