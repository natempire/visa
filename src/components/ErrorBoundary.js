import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
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
          justifyContent: 'center', padding: 48, gap: 16, textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={26} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              Une erreur est survenue
            </div>
            <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360 }}>
              {this.state.error?.message || 'Erreur inattendue. Veuillez réessayer.'}
            </div>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--navy)', color: 'white', border: 'none', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
