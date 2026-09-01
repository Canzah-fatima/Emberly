import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import CommentSection from './CommentSection';

export default function CommentsModal({ postId, onClose, onCountChange }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return <AnimatePresence>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.section initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} className="flex h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-emberly-ivory/10 bg-emberly-navy shadow-2xl sm:h-[min(720px,84dvh)] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-emberly-ivory/10 px-4 py-3.5 sm:px-5">
          <div className="w-9" />
          <div className="text-center"><h2 className="text-sm font-bold">Comments</h2><div className="mx-auto mt-1 h-0.5 w-7 rounded-full bg-emberly-crimson" /></div>
          <button type="button" onClick={onClose} ref={closeRef} className="grid h-9 w-9 place-items-center rounded-full text-emberly-ivory/55 hover:bg-emberly-ivory/10 hover:text-emberly-ivory" aria-label="Close comments" autoFocus><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><CommentSection postId={postId} onCountChange={onCountChange} /></div>
      </motion.section>
    </motion.div>
  </AnimatePresence>;
}
