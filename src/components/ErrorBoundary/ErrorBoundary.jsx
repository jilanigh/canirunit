import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', gap: '16px',
          color: 'var(--muted, #aaa)', fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--accent, #e74c3c)' }}>Something went wrong</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
              background: 'var(--accent, #e74c3c)', color: '#fff', border: 'none'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
