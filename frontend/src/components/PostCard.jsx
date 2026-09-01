import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Heart, MessageCircle, MoreHorizontal, Send, Smartphone, X } from 'lucide-react';
import Caption from './Caption';
import PostMedia from './PostMedia';
import SaveButton from './SaveButton';
import api from '../api/axios';

const FALLBACK_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%230C3249"/%3E%3Ccircle cx="48" cy="38" r="17" fill="%23FFF1D6" fill-opacity=".7"/%3E%3Cpath d="M20 82c5-18 51-18 56 0" fill="%23679CBC" fill-opacity=".8"/%3E%3C/svg%3E';

function getMedia(post) {
  if (Array.isArray(post?.media)) return post.media;
  if (Array.isArray(post?.images)) return post.images.map((item) => typeof item === 'string' ? { url: item } : item);
  if (Array.isArray(post?.mediaUrls)) return post.mediaUrls.map((url) => ({ url }));
  if (post?.imageUrl) return [{ url: post.imageUrl }];
  return [];
}
function getUser(post) { return post?.user || post?.author || post?.creator || {}; }
function getAvatar(user) { return user?.avatarUrl || user?.profilePicture || user?.profilePictureUrl || user?.imageUrl || user?.avatar || FALLBACK_AVATAR; }
function getName(user) { return user?.username || user?.fullName || user?.name || 'emberly user'; }
function count(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}
function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = 60000, hour = 3600000, day = 86400000;
  if (diff < minute) return 'now';
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, currentUser, onLike, onComment, onDelete, onEdit, onShare }) {
  const navigate = useNavigate();
  const user = getUser(post);
  const media = useMemo(() => getMedia(post), [post]);
  const postId = post?.id || post?._id;
  const initialLiked = Boolean(post?.isLiked ?? post?.likedByCurrentUser ?? post?.liked);
  const initialLikes = Number(post?.likesCount ?? post?.likeCount ?? post?._count?.likes ?? post?.likes?.length ?? 0);
  const comments = Number(post?.commentsCount ?? post?.commentCount ?? post?._count?.comments ?? post?.comments?.length ?? 0);
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const menuRef = useRef(null);
  const postUrl = post?.url || `${window.location.origin}/post/${postId}`;
  const isOwner = currentUser?.id && user?.id && String(currentUser.id) === String(user.id);

  useEffect(() => {
    setLiked(Boolean(post?.isLiked ?? post?.likedByCurrentUser ?? post?.liked));
    setLikesCount(Number(post?.likesCount ?? post?.likeCount ?? post?._count?.likes ?? post?.likes?.length ?? 0));
  }, [post?.id, post?.isLiked, post?.likedByCurrentUser, post?.liked, post?.likesCount, post?.likeCount]);

  useEffect(() => {
    const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!shareOpen) return undefined;
    const escape = (event) => event.key === 'Escape' && setShareOpen(false);
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [shareOpen]);

  async function handleLike() {
    if (!postId || busy) return;
    const next = !liked;
    setLiked(next); setLikesCount((n) => Math.max(0, n + (next ? 1 : -1))); setBusy(true);
    try {
      const result = typeof onLike === 'function' ? await onLike(postId, next) : (await api.post(`/posts/${postId}/like`)).data;
      if (typeof result?.liked === 'boolean') setLiked(result.liked);
      if (typeof result?.likesCount === 'number') setLikesCount(result.likesCount);
      if (typeof result?.likeCount === 'number') setLikesCount(result.likeCount);
    } catch { setLiked(!next); setLikesCount((n) => Math.max(0, n + (next ? -1 : 1))); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(postUrl); setShareToast('Link copied'); }
    catch { setShareToast('Could not copy link'); }
    setTimeout(() => setShareToast(''), 2200);
  }
  function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(`${post?.caption || ''}\n\n${postUrl}`)}`, '_blank', 'noopener,noreferrer'); }
  function shareX() { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post?.caption || 'See this on Emberly')}&url=${encodeURIComponent(postUrl)}`, '_blank', 'noopener,noreferrer'); }
  async function nativeShare() {
    if (!navigator.share) { setShareToast('Device sharing is unavailable'); setTimeout(() => setShareToast(''), 2200); return; }
    try { await navigator.share({ title: getName(user), text: post?.caption || 'See this on Emberly', url: postUrl }); } catch (error) { if (error?.name !== 'AbortError') console.error(error); }
  }
  async function deletePost() { setMenuOpen(false); if (typeof onDelete === 'function') await onDelete(post); }
  async function editPost() { setMenuOpen(false); if (typeof onEdit === 'function') await onEdit(post); }

  return (
    <article className="w-full overflow-visible border-b border-emberly-ivory/10 bg-emberly-navy text-emberly-ivory sm:rounded-2xl sm:border sm:border-emberly-ivory/10 sm:shadow-[0_16px_45px_rgba(0,0,0,.18)]">
      <header className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
        <Link to={user?.username ? `/${user.username}` : '#'} className="group flex min-w-0 flex-1 items-center gap-3">
          <img src={getAvatar(user)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-emberly-blue/30" onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold tracking-[-.01em] group-hover:text-emberly-blue-soft">{user?.username || getName(user)}</span>
            <span className="mt-0.5 block text-[11px] text-emberly-ivory/50">{timeAgo(post?.createdAt || post?.created_at || post?.date)}</span>
          </span>
        </Link>
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full text-emberly-ivory/60 transition hover:bg-emberly-ivory/10 hover:text-emberly-ivory" aria-label="Post options"><MoreHorizontal size={19} /></button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-40 w-44 overflow-hidden rounded-xl border border-emberly-ivory/15 bg-emberly-navy-deep p-1.5 shadow-2xl">
              {isOwner && <>
                <button type="button" onClick={editPost} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-emberly-ivory/10">Edit post</button>
                <button type="button" onClick={deletePost} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-emberly-crimson-soft hover:bg-emberly-crimson/10">Delete post</button>
                <div className="my-1 border-t border-emberly-ivory/10" />
              </>}
              <button type="button" onClick={() => { setMenuOpen(false); copyLink(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-emberly-ivory/70 hover:bg-emberly-ivory/10 hover:text-emberly-ivory"><Copy size={15} /> Copy link</button>
            </div>
          )}
        </div>
      </header>

      {media.length > 0 && (
        <div className="relative overflow-hidden sm:rounded-none">
          <PostMedia media={media} alt={post?.caption || 'Post'} />
        </div>
      )}

      <div className="px-3.5 pb-3 pt-2.5 sm:px-4">
        <div className="flex items-center">
          <div className="flex items-center gap-0.5">
            <motion.button type="button" onClick={handleLike} disabled={busy} aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} whileTap={{ scale: 0.84 }} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-emberly-ivory/10 disabled:opacity-60">
              <motion.span animate={{ scale: liked ? [1, 1.26, 1] : 1 }} transition={{ duration: 0.22 }} className="grid place-items-center"><Heart size={23} strokeWidth={liked ? 2.5 : 1.8} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-emberly-crimson-soft' : 'text-emberly-ivory'} /></motion.span>
            </motion.button>
            <button type="button" onClick={() => onComment?.(post)} aria-label="View comments" className="grid h-10 w-10 place-items-center rounded-full text-emberly-ivory transition hover:bg-emberly-ivory/10"><MessageCircle size={22} strokeWidth={1.8} /></button>
            <button type="button" onClick={() => { onShare?.(post); setShareOpen(true); }} aria-label="Share post" className="grid h-10 w-10 place-items-center rounded-full text-emberly-ivory transition hover:bg-emberly-ivory/10"><Send size={21} strokeWidth={1.8} /></button>
          </div>
          <div className="ml-auto"><SaveButton postId={postId} initialSaved={Boolean(post?.isSaved ?? post?.saved)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-emberly-ivory/10" /></div>
        </div>
        {likesCount > 0 && <button type="button" onClick={() => onComment?.(post)} className="mt-1 block text-[13px] font-bold hover:text-emberly-blue-soft">{count(likesCount)} {likesCount === 1 ? 'like' : 'likes'}</button>}

        {post?.caption && (
          <div className="mt-2 text-[13px] leading-[1.5] text-emberly-ivory/90">
            <Caption username={user?.username || getName(user)} text={post.caption} expanded={captionOpen} onToggle={() => setCaptionOpen((v) => !v)} limit={105} />
          </div>
        )}

        {comments > 0 && <button type="button" onClick={() => onComment?.(post)} className="mt-2 text-[13px] text-emberly-ivory/45 transition hover:text-emberly-ivory/75">View all {count(comments)} {comments === 1 ? 'comment' : 'comments'}</button>}
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setShareOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Share post" className="w-full max-w-md overflow-hidden rounded-t-3xl border border-emberly-ivory/10 bg-emberly-navy-deep shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-emberly-ivory/10 px-5 py-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emberly-blue">Share</p><h2 className="mt-1 font-display text-xl font-bold">Share this post</h2></div>
              <button type="button" onClick={() => setShareOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-emberly-ivory/60 hover:bg-emberly-ivory/10 hover:text-emberly-ivory" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 border-b border-emberly-ivory/10 px-5 py-4"><img src={getAvatar(user)} alt="" className="h-11 w-11 rounded-full object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold">{getName(user)}</p><p className="truncate text-xs text-emberly-ivory/45">{postUrl.replace(/^https?:\/\//, '')}</p></div><Check size={18} className="ml-auto text-emberly-blue" /></div>
            <div className="grid gap-1 p-2">
              <button type="button" onClick={() => { setShareOpen(false); navigate(`/messages?sharePost=${encodeURIComponent(postId)}`); }} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emberly-ivory/10"><span className="grid h-10 w-10 place-items-center rounded-full bg-emberly-crimson text-emberly-ivory"><Send size={17} /></span><span><strong className="block text-sm">Send in Emberly</strong><small className="text-xs text-emberly-ivory/45">Share privately in messages</small></span></button>
              <button type="button" onClick={shareWhatsApp} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emberly-ivory/10"><span className="grid h-10 w-10 place-items-center rounded-full bg-emberly-blue text-emberly-navy"><Smartphone size={17} /></span><span><strong className="block text-sm">WhatsApp</strong><small className="text-xs text-emberly-ivory/45">Send in a chat</small></span></button>
              <button type="button" onClick={shareX} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emberly-ivory/10"><span className="grid h-10 w-10 place-items-center rounded-full border border-emberly-ivory/15"><span className="text-sm font-bold">X</span></span><span><strong className="block text-sm">X / Twitter</strong><small className="text-xs text-emberly-ivory/45">Post a link</small></span></button>
              <button type="button" onClick={copyLink} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emberly-ivory/10"><span className="grid h-10 w-10 place-items-center rounded-full bg-emberly-ivory text-emberly-navy"><Copy size={17} /></span><span><strong className="block text-sm">Copy link</strong><small className="text-xs text-emberly-ivory/45">Save to clipboard</small></span></button>
              <button type="button" onClick={nativeShare} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emberly-ivory/10"><span className="grid h-10 w-10 place-items-center rounded-full bg-emberly-ivory/10"><Smartphone size={17} /></span><span><strong className="block text-sm">More options</strong><small className="text-xs text-emberly-ivory/45">Use device share</small></span></button>
            </div>
          </div>
        </div>
      )}
      {shareToast && <div className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-emberly-ivory px-4 py-2.5 text-xs font-bold text-emberly-navy shadow-xl"><Check size={14} className="text-emberly-crimson" />{shareToast}</div>}
    </article>
  );
}
