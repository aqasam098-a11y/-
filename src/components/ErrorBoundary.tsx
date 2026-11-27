import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getFirebaseUpgradeConsoleUrl,
  isQuotaExceededFirestoreError,
} from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Unexpected application error';
    let parsedSummary = raw;
    let isPermissionError = false;
    try {
      const json = JSON.parse(raw);
      if (json && typeof json === 'object' && json.error) {
        parsedSummary = `${json.operationType?.toUpperCase() || 'FIRESTORE'} ${json.path || ''}: ${json.error}`;
        isPermissionError = String(json.error)
          .toLowerCase()
          .includes('permission');
      }
    } catch {
      isPermissionError = raw.toLowerCase().includes('permission');
    }

    return {
      hasError: true,
      errorMessage: parsedSummary,
      isPermissionError,
      isQuotaError: isQuotaExceededFirestoreError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Desi Beej ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#102B19] text-[#F8F7EA] flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl bg-[#13311D] border border-[#E5C65A]/40 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 text-[#FFF0A3] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#FFF0A3]">
                Something went wrong / خرابی پیش آگئی
              </h1>
              <p className="text-xs text-[#C7D3BD]">
                {this.state.isQuotaError
                  ? 'Daily Firestore free-tier quota was reached. It resets tomorrow.'
                  : this.state.isPermissionError
                    ? 'Access denied by Firestore security rules. Please check your signed-in account or role.'
                    : 'A database or rendering error occurred.'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs font-mono text-[#D7E2CE] break-words max-h-40 overflow-y-auto">
            {this.state.errorMessage}
          </div>

          {this.state.isQuotaError && (
            <a
              href={getFirebaseUpgradeConsoleUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-[#E5C65A] underline hover:text-[#FFF0A3]"
            >
              Open Firestore Database Console
            </a>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application / دوبارہ لوڈ کریں</span>
          </button>
        </div>
      </div>
    );
  }
}
