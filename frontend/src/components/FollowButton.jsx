import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

// relationship: 'none' | 'following' | 'requested'
export default function FollowButton({ username, initialRelationship, isPrivateTarget, onChange, className = '' }) {
  const { showToast } = useToast();
  const [relationship, setRelationship] = useState(initialRelationship);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => setRelationship(initialRelationship), [initialRelationship]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const call = async () => {
    if (busy) return;
    const previous = relationship;
    const optimistic = relationship === 'none' ? (isPrivateTarget ? 'requested' : 'following') : 'none';
    setRelationship(optimistic);
    setBusy(true);
    try {
      const res = await api.post(`/users/${username}/follow`);
      setRelationship(res.data.relationship);
      onChange && onChange(res.data.relationship);
      if (res.data.relationship === 'requested') showToast('Follow request sent');
      if (res.data.relationship === 'none') showToast('Unfollowed');
      if (res.data.relationship === 'following') showToast(`Following ${username}`);
    } catch {
      setRelationship(previous);
      onChange && onChange(previous);
      showToast('Something went wrong', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (relationship === 'none') {
      call();
    } else {
      // following or requested -> open confirm menu instead of instant unfollow
      setMenuOpen((v) => !v);
    }
  };

  if (relationship === 'none') {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        className={`px-4 py-1.5 rounded-full text-sm font-medium bg-emberly-crimson text-emberly-ivory hover:bg-emberly-crimson-dark transition-colors disabled:opacity-60 ${className}`}
      >
        {isPrivateTarget ? 'Follow' : 'Follow'}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleClick}
        disabled={busy}
        className={`px-4 py-1.5 rounded-full text-sm font-medium bg-transparent border border-emberly-ivory/12 text-emberly-ivory hover:border-emberly-blue hover:text-emberly-crimson-soft transition-colors disabled:opacity-60 ${className}`}
      >
        {relationship === 'requested' ? 'Requested' : 'Following'}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 z-20 rounded-xl border border-white/10 bg-emberly-navy-soft overflow-hidden shadow-xl shadow-black/30 w-40"
          >
            <button
              onClick={() => { setMenuOpen(false); call(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-emberly-crimson hover:bg-emberly-navy transition-colors"
            >
              {relationship === 'requested' ? 'Cancel request' : 'Unfollow'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
