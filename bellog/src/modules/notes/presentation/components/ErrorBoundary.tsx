import { Component, ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showResetButton?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorFallbackProps {
  error: Error
  onReset?: () => void
}

type ErrorFallbackProps = {
  error: Error
  onReset?: () => void
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return (
          <this.props.fallback
            error={this.state.error!}
            onReset={this.props.showResetButton !== false ? this.handleReset : undefined}
          />
        )
      }

      return (
        <ErrorFallback
          error={this.state.error!}
          onReset={this.props.showResetButton !== false ? this.handleReset : undefined}
        />
      )
    }

    return this.props.children
  }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
      <div className="w-16 h-16 mb-4 text-red-500 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold mb-2 text-[#2a2a2a]">Algo deu errado</h2>

      <p className="text-[#919191] mb-4 text-center max-w-md">
        Ocorreu um erro inesperado. Você pode tentar novamente ou entrar em contato com o suporte.
      </p>

      {error?.message && (
        <div className="bg-[#f5f5f5] rounded p-4 mb-4 max-w-lg w-full">
          <p className="text-sm text-[#666] font-mono break-all">{error.message}</p>
        </div>
      )}

      <div className="flex gap-4">
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center justify-center h-[45px] px-6 py-2 rounded bg-[#e67c26] text-white font-bold text-[14px] hover:bg-[#d46f1f] transition-colors"
          >
            Tentar novamente
          </button>
        )}

        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center justify-center h-[45px] px-6 py-2 rounded bg-[#f0f0f0] text-[#2a2a2a] font-bold text-[14px] hover:bg-[#e0e0e0] transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  )
}

export { ErrorBoundary, ErrorFallback }
export type { ErrorBoundaryProps, ErrorFallbackProps }