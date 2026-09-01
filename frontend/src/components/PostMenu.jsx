import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreIcon } from './icons';
import { useToast } from '../context/ToastContext';

export default function PostMenu({ isOwner, onDelete, onReport, onUnfollow, username }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard?.writeText(url).then(() => showToast('Link copied'));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="grid h-9 w-9 place-items-center rounded-xl text-emberly-ivory/45 transition hover:bg-emberly-ivory/5 hover:text-emberly-ivory"
      >
        <MoreIcon className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep shadow-2xl shadow-black/30 text-sm"
          >
            {isOwner ? (
              <>
                <button
                  onClick={() => { setOpen(false); onDelete(); }}
                  className="w-full px-4 py-3 text-left text-emberly-crimson-soft transition hover:bg-emberly-ivory/5"
                >
                  Delete
                </button>
                <button onClick={copyLink} className="w-full px-4 py-3 text-left transition hover:bg-emberly-ivory/5">
                  Copy link
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setOpen(false); onUnfollow && onUnfollow(); }}
                  className="w-full px-4 py-3 text-left transition hover:bg-emberly-ivory/5"
                >
                  Unfollow @{username}
                </button>
                <button onClick={copyLink} className="w-full px-4 py-3 text-left transition hover:bg-emberly-ivory/5">
                  Copy link
                </button>
                <button
                  onClick={() => { setOpen(false); onReport(); }}
                  className="w-full px-4 py-3 text-left text-emberly-crimson-soft transition hover:bg-emberly-ivory/5"
                >
                  Report
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
