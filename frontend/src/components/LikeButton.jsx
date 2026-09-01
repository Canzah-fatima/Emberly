import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LikeButton({ postId, liked, count, onLiked }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!user || busy) return;
    const next = !liked;
    const optimistic = Math.max(0, count + (next ? 1 : -1));
    onLiked?.(next, optimistic);
    setBusy(true);
    try {
      const res = await api.post(`/posts/${postId}/like`);
      onLiked?.(res.data.liked, res.data.likeCount);
    } catch {
      onLiked?.(!next, count);
    } finally { setBusy(false); }
  };
  return (
    <motion.button type="button" onClick={toggle} disabled={!user || busy} aria-pressed={liked} aria-label={liked ? 'Unlike post' : 'Like post'} whileTap={{ scale: 0.84 }} className="group grid h-10 w-10 place-items-center rounded-full transition hover:bg-emberly-ivory/10 disabled:opacity-50">
      <motion.span animate={{ scale: liked ? [1, 1.24, 1] : 1 }} transition={{ duration: 0.22 }} className="grid place-items-center"><Heart size={23} strokeWidth={liked ? 2.4 : 1.8} fill={liked ? 'currentColor' : 'none'} className={`transition ${liked ? 'text-emberly-crimson-soft' : 'text-emberly-ivory group-hover:text-emberly-blue-soft'}`} /></motion.span>
    </motion.button>
  );
}
