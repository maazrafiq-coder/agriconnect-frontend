import { Component } from 'react';
import T from '../theme';

/**
 * Catches render-time errors anywhere in the component tree below it and
 * shows a recoverable fallback instead of a blank white screen. Without
 * this, a single bad product record or a null-reference in any page
 * component takes down the entire app for that user.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production this is where you'd forward to Sentry/Logtail/etc.
    console.error('AgriConnect crashed:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.bg, padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🌾💔</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 10px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
            This page hit an unexpected error. Your data is safe — try going back to the home page.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: T.green, color: '#fff', border: 'none', padding: '11px 24px',
              borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }
}
