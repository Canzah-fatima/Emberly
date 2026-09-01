import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MoreHorizontal, Send, Smile } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import MentionSuggestions from './MentionSuggestions';
import EmojiPicker from './EmojiPicker';

function timeAgo(value) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CommentItem({ comment, replies, user, activeReplyId, onStartReply, onLike, onReply, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || '');
  const [replyText, setReplyText] = useState('');
  const [replyCaret, setReplyCaret] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const inputRef = useRef(null);
  const mine = user && (String(user.id) === String(comment.author?.id) || user.username === comment.author?.username);
  const replying = activeReplyId === comment.id;

  useEffect(() => { if (replying) requestAnimationFrame(() => inputRef.current?.focus()); }, [replying]);
  function addEmoji(emoji) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? replyText.length;
    const end = el?.selectionEnd ?? replyText.length;
    const next = `${replyText.slice(0, start)}${emoji}${replyText.slice(end)}`;
    setReplyText(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + emoji.length, start + emoji.length); });
  }
  async function submitReply(event) {
    event.preventDefault();
    if (!replyText.trim() || replySubmitting) return;
    setReplySubmitting(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setEmojiOpen(false);
      onStartReply(null);
    } finally {
      setReplySubmitting(false);
    }
  }
  async function saveEdit() {
    const value = editText.trim();
    if (!value || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await onEdit(comment.id, value);
      setEditing(false);
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="py-2.5">
      <div className="flex gap-2.5">
        <Avatar user={comment.author} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-[13px] leading-[1.45]">
              <span className="mr-1.5 font-bold text-emberly-ivory">{comment.author?.username || 'user'}</span>
              {editing ? <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={500} className="w-full rounded-lg border border-emberly-ivory/15 bg-emberly-navy px-2 py-1 text-emberly-ivory outline-none focus:border-emberly-blue" /> : <span className="text-emberly-ivory/85 break-words">{comment.text}</span>}
            </div>
            <motion.button type="button" whileTap={{ scale: 0.82 }} onClick={() => onLike(comment.id, comment.liked, comment.likeCount)} className="mt-0.5 shrink-0 rounded-full p-1 text-emberly-ivory/45 hover:bg-emberly-ivory/5 hover:text-emberly-ivory" aria-label={comment.liked ? 'Unlike comment' : 'Like comment'}><motion.span animate={{ scale: comment.liked ? [1, 1.22, 1] : 1 }} transition={{ duration: 0.2 }} className="grid place-items-center"><Heart size={13} fill={comment.liked ? 'currentColor' : 'none'} className={comment.liked ? 'text-emberly-crimson-soft' : ''} /></motion.span></motion.button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-emberly-ivory/40">
            <span>{timeAgo(comment.createdAt)}</span>
            {comment.likeCount > 0 && <span>{comment.likeCount} {comment.likeCount === 1 ? 'like' : 'likes'}</span>}
            {user && <button type="button" onClick={() => onStartReply(replying ? null : comment.id)} className="hover:text-emberly-ivory">{replying ? 'Cancel' : 'Reply'}</button>}
            {mine && !editing && <button type="button" onClick={() => setEditing(true)} className="hover:text-emberly-ivory">Edit</button>}
            {mine && !editing && <button type="button" onClick={() => onDelete(comment.id)} className="hover:text-emberly-crimson-soft">Delete</button>}
            {editing && <button type="button" onClick={saveEdit} disabled={editSubmitting} className="text-emberly-blue disabled:opacity-40">{editSubmitting ? 'Saving…' : 'Save'}</button>}
            {editing && <button type="button" onClick={() => { setEditText(comment.text); setEditing(false); }}>Cancel</button>}
          </div>
        </div>
      </div>

      {replying && user && <form onSubmit={submitReply} className="ml-10 mt-2.5 flex items-center gap-2 border-l border-emberly-ivory/10 pl-3">
        <Avatar user={user} size={27} />
        <div className="relative min-w-0 flex-1">
          <input ref={inputRef} value={replyText} onChange={(e) => { setReplyText(e.target.value); setReplyCaret(e.target.selectionStart ?? e.target.value.length); }} onKeyUp={(e) => setReplyCaret(e.currentTarget.selectionStart)} placeholder={`Reply to ${comment.author?.username || 'user'}…`} maxLength={500} className="w-full bg-transparent py-2 text-xs text-emberly-ivory outline-none placeholder:text-emberly-ivory/30" />
          <MentionSuggestions value={replyText} caret={replyCaret} onSelect={(account, token) => { const next = `${replyText.slice(0, token.start)}@${account.username} ${replyText.slice(token.end)}`; setReplyText(next); }} />
          {emojiOpen && <EmojiPicker onPick={addEmoji} onClose={() => setEmojiOpen(false)} compact />}
        </div>
        <button type="button" onClick={() => setEmojiOpen((v) => !v)} className="text-emberly-ivory/40 hover:text-emberly-blue" aria-label="Add emoji"><Smile size={16} /></button>
        <button type="submit" disabled={!replyText.trim() || replySubmitting} className="min-w-12 rounded-full px-2 py-1 text-xs font-bold text-emberly-blue transition hover:bg-emberly-blue/10 disabled:opacity-30">{replySubmitting ? '…' : 'Reply'}</button>
      </form>}

      {replies.length > 0 && <div className="ml-10 border-l border-emberly-ivory/10 pl-3">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} replies={[]} user={user} activeReplyId={activeReplyId} onStartReply={onStartReply} onLike={onLike} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)}</div>}
    </motion.div>
  );
}

export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [caret, setCaret] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/posts/${postId}/comments`).then((res) => { if (!alive) return; const next = res.data.comments || []; setComments(next); onCountChange?.(next.length); }).catch(() => { if (alive) setComments([]); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [postId]);

  const grouped = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const replies = new Map();
    comments.filter((c) => c.parentId).forEach((c) => replies.set(c.parentId, [...(replies.get(c.parentId) || []), c]));
    return { roots, replies };
  }, [comments]);

  function addEmoji(emoji) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(`${text.slice(0, start)}${emoji}${text.slice(end)}`);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + emoji.length, start + emoji.length); });
  }
  async function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, { text: value });
      setComments((prev) => [...prev, res.data.comment]);
      setText('');
      setEmojiOpen(false);
      onCountChange?.(res.data.commentCount ?? comments.length + 1);
    } catch {
      showToast('Could not post your comment', { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  }
  async function reply(parentId, value) {
    try {
      const res = await api.post(`/posts/${postId}/comments`, { text: value, parentId });
      setComments((prev) => [...prev, res.data.comment]);
      onCountChange?.(res.data.commentCount ?? comments.length + 1);
    } catch {
      showToast('Could not post your reply', { tone: 'error' });
      throw new Error('reply_failed');
    }
  }
  async function like(id, liked, count) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked: !liked, likeCount: Math.max(0, count + (liked ? -1 : 1)) } : c));
    try { const res = await api.post(`/posts/comments/${id}/like`); setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked: res.data.liked, likeCount: res.data.likeCount } : c)); }
    catch { setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked, likeCount: count } : c)); showToast('Could not update that like', { tone: 'error' }); }
  }
  async function edit(id, value) {
    try {
      const res = await api.patch(`/posts/comments/${id}`, { text: value });
      setComments((prev) => prev.map((c) => c.id === id ? res.data.comment : c));
    } catch {
      showToast('Could not save your edit', { tone: 'error' });
      throw new Error('edit_failed');
    }
  }
  async function remove(id) {
    try {
      const res = await api.delete(`/posts/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      onCountChange?.(res.data.commentCount ?? Math.max(0, comments.length - 1));
      showToast('Comment removed');
    } catch {
      showToast('Could not delete that comment', { tone: 'error' });
    }
  }

  return <div className="flex min-h-0 flex-col">
    <div className="min-h-0 flex-1 px-4 sm:px-5">
      {loading && <div className="space-y-4 py-5"><div className="h-10 w-3/4 animate-pulse rounded-lg bg-emberly-ivory/5" /><div className="h-10 w-2/3 animate-pulse rounded-lg bg-emberly-ivory/5" /><div className="h-10 w-4/5 animate-pulse rounded-lg bg-emberly-ivory/5" /></div>}
      {!loading && !comments.length && <div className="flex min-h-[180px] flex-col items-center justify-center py-10 text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-emberly-blue/25 bg-emberly-blue/10"><MessageCircleIcon /></div><p className="text-sm font-bold">No comments yet</p><p className="mt-1 text-xs text-emberly-ivory/40">Start the conversation.</p></div>}
      <AnimatePresence initial={false}>{grouped.roots.map((comment) => <CommentItem key={comment.id} comment={comment} replies={grouped.replies.get(comment.id) || []} user={user} activeReplyId={activeReplyId} onStartReply={setActiveReplyId} onLike={like} onReply={reply} onEdit={edit} onDelete={remove} />)}</AnimatePresence>
    </div>
    <div className="sticky bottom-0 border-t border-emberly-ivory/10 bg-emberly-navy-deep px-3 py-2.5 sm:px-4">
      {user ? <form onSubmit={submit} className="flex items-center gap-2.5"><Avatar user={user} size={34} /><div className="relative min-w-0 flex-1 rounded-full border border-emberly-ivory/10 bg-emberly-navy px-3.5 py-2 focus-within:border-emberly-blue/60"><input ref={inputRef} value={text} onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }} onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)} placeholder="Add a comment…" maxLength={500} className="w-full bg-transparent pr-7 text-xs text-emberly-ivory outline-none placeholder:text-emberly-ivory/30" /><MentionSuggestions value={text} caret={caret} onSelect={(account, token) => setText(`${text.slice(0, token.start)}@${account.username} ${text.slice(token.end)}`)} />{emojiOpen && <EmojiPicker onPick={addEmoji} onClose={() => setEmojiOpen(false)} compact />}<button type="button" onClick={() => setEmojiOpen((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emberly-ivory/40 hover:text-emberly-blue" aria-label="Add emoji"><Smile size={15} /></button></div><button type="submit" disabled={!text.trim() || submitting} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emberly-crimson text-emberly-ivory transition hover:bg-emberly-crimson-dark disabled:opacity-30" aria-label="Post comment"><Send size={15} /></button></form> : <p className="py-2 text-center text-xs text-emberly-ivory/40">Log in to join the conversation.</p>}
    </div>
  </div>;
}

function MessageCircleIcon() { return <span className="text-emberly-blue"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.4-.7L4 20l1.7-3.7A7.5 7.5 0 1 1 20 11.5Z" /></svg></span>; }
