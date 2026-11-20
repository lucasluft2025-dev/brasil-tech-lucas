import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ocorreu um erro inesperado.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Brasil Tech ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      let friendly = 'Algo deu errado ao processar esta operação.';
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Permissão ou validação negada em ${parsed.path || 'banco de dados'}: ${parsed.error}`;
        }
      } catch {
        friendly = this.state.message;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#f4f6fa',
            padding: 20,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#fff',
              border: '1px solid #e1e6f0',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 10px 30px #101b3314',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <h2 style={{ margin: '0 0 8px', color: '#101b33', fontSize: 18 }}>
              Brasil Tech — Proteção de Sessão
            </h2>
            <p style={{ margin: '0 0 16px', color: '#5c667a', fontSize: 13, lineHeight: 1.5 }}>
              {friendly}
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
