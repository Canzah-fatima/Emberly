import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, MessageCircle, Send, Smartphone, X, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function shareUrl(base, params) {
  return `${base}?${new URLSearchParams(params).toString()}`;
}

export default function ShareSheet({ post, open, onClose }) {
  const closeRef = useRef(null);
  const { showToast } = useToast();
  const url = `${window.location.origin}/post/${post.id}`;
  const text = `${post.author.username} on Emberly`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => closeRef.current?.focus());
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      showToast('Link copied');
      onClose();
    } catch {
      showToast('Could not copy link', { tone: 'error' });
    }
  };

  const openExternal = (targetUrl) => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer,width=720,height=720');
    onClose();
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      showToast('Native sharing is not available on this device');
      return;
    }
    try {
      await navigator.share({ title: text, text: `See this post from @${post.author.username} on Emberly.`, url });
      onClose();
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Could not open the share sheet', { tone: 'error' });
    }
  };

  const actions = [
    { label: 'WhatsApp', detail: 'Send directly', icon: MessageCircle, className: '', onClick: () => openExternal(shareUrl('https://api.whatsapp.com/send', { text: `${text} — ${url}` })) },
    { label: 'X', detail: 'Post to X', icon: X, className: '', onClick: () => openExternal(shareUrl('https://twitter.com/intent/tweet', { text, url })) },
    { label: 'Messenger', detail: 'Share in Messenger', icon: Send, className: '', onClick: () => openExternal(shareUrl('https://www.facebook.com/dialog/send', { link: url })) },
    { label: 'Copy link', detail: 'Save to clipboard', icon: Copy, className: '', onClick: copyLink },
    ...(typeof navigator.share === 'function' ? [{ label: 'Device share', detail: 'Use your device share sheet', icon: Smartphone, className: '', onClick: nativeShare }] : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-emberly-navy/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
            className="max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-emberly-ivory/10 bg-emberly-navy-deep shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-emberly-ivory/10 p-5">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-emberly-crimson-soft">Share this post</p>
                <h2 id="share-sheet-title">Share this post with someone.</h2>
              </div>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-emberly-ivory/45 hover:bg-emberly-ivory/5" onClick={onClose} ref={closeRef} aria-label="Close share sheet"><X size={18} /></button>
            </header>

            <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-emberly-ivory/5 p-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-emberly-navy-soft"><img src={post.author.avatarUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
              <div className="min-w-0"><strong>@{post.author.username}</strong><span>{post.caption || 'A post from Emberly'}</span></div>
              <Check size={18} className="ml-auto text-emberly-blue" />
            </div>

            <div className="grid gap-2 p-5">
              {actions.map(({ label, detail, icon: Icon, className, onClick }) => (
                <button type="button" key={label} className={`group flex items-center gap-3 rounded-2xl border border-emberly-ivory/10 bg-emberly-navy px-3 py-3 text-left transition hover:border-emberly-blue/50 hover:bg-emberly-navy-soft ${className}`} onClick={onClick}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emberly-ivory/5 text-emberly-blue group-hover:bg-emberly-crimson group-hover:text-emberly-ivory"><Icon size={20} strokeWidth={2} /></span>
                  <span><strong className="text-sm">{label}</strong><small className="mt-0.5 block text-xs text-emberly-ivory/40">{detail}</small></span>
                </button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
