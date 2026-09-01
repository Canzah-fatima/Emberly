import { Component } from 'react';
import { Sparkles } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep production failures actionable without exposing stack traces to users.
    console.error('Emberly UI error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3F0D10] text-[#C11720]"><Sparkles size={20} /></div>
          <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Emberly hit an unexpected UI error. Your account and saved data are safe. Reload the app to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-7 rounded-full bg-[#C11720] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Reload Emberly
          </button>
          {import.meta.env.DEV && this.state.error?.message ? (
            <p className="mt-5 break-words text-left text-xs text-white/40">{this.state.error.message}</p>
          ) : null}
        </section>
      </main>
    );
  }
}
