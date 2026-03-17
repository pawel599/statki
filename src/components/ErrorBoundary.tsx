import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-8"
          style={{ background: '#000', color: '#cc2200', fontFamily: 'monospace' }}
        >
          <div style={{ fontSize: '1.5rem', textShadow: '0 0 10px #ff0000' }}>
            BŁĄD APLIKACJI
          </div>
          <pre style={{ fontSize: '0.75rem', color: '#ff4422', maxWidth: '600px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'rgba(180,0,40,0.2)', border: '1px solid #880022', color: '#dd3311', cursor: 'pointer' }}
          >
            Odśwież
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
