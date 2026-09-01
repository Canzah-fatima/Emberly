import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Plus, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import CommentsModal from '../components/CommentsModal';
import ConfirmDialog from '../components/ConfirmDialog';
import StoriesRow from '../components/StoriesRow';

function FeedSkeleton() {
  return <div className="overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-soft/35">
    <div className="flex items-center gap-3 px-4 py-3"><div className="h-9 w-9 animate-pulse rounded-full bg-emberly-ivory/10" /><div className="space-y-1.5"><div className="h-2.5 w-24 animate-pulse rounded bg-emberly-ivory/10" /><div className="h-2 w-12 animate-pulse rounded bg-emberly-ivory/5" /></div></div>
    <div className="aspect-[4/5] animate-pulse bg-emberly-navy-soft" />
    <div className="space-y-3 px-4 py-4"><div className="flex gap-3"><div className="h-7 w-20 animate-pulse rounded bg-emberly-ivory/10" /><div className="h-7 w-7 animate-pulse rounded bg-emberly-ivory/10" /></div><div className="h-3 w-28 animate-pulse rounded bg-emberly-ivory/10" /><div className="h-3 w-4/5 animate-pulse rounded bg-emberly-ivory/10" /></div>
  </div>;
}

export default function Feed() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState(null);
  const [nextBefore, setNextBefore] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [ownPostCount, setOwnPostCount] = useState(null);

  useEffect(() => {
    api.get('/posts/feed').then((res) => { setPosts(res.data.posts || []); setNextBefore(res.data.nextBefore || null); }).catch(() => { setPosts([]); showToast('Could not load your feed'); });

    if (user?.username) {
      api.get(`/users/${encodeURIComponent(user.username)}`)
        .then((res) => setOwnPostCount(Number(res.data.postCount || 0)))
        .catch(() => setOwnPostCount(0));
    } else {
      setOwnPostCount(0);
    }
  }, [user?.username, showToast]);
  useEffect(() => {
    const onPostCreated = (event) => {
      if (event.detail) {
        setPosts((prev) => [event.detail, ...(prev || [])]);
        setOwnPostCount((count) => (count === null ? 1 : count + 1));
      }
    };
    window.addEventListener('emberly:post-created', onPostCreated);
    return () => window.removeEventListener('emberly:post-created', onPostCreated);
  }, []);

  const handleLike = async (postId) => { const res = await api.post(`/posts/${postId}/like`); return { liked: res.data.liked, likesCount: res.data.likeCount }; };
  const handleCommentCountChange = (postId, count) => setPosts((prev) => prev?.map((p) => p.id === postId ? { ...p, commentCount: count, commentsCount: count } : p));
  const loadMore = async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try { const res = await api.get('/posts/feed', { params: { before: nextBefore, limit: 20 } }); setPosts((prev) => [...(prev || []), ...(res.data.posts || [])]); setNextBefore(res.data.nextBefore || null); }
    catch { showToast('Could not load more posts'); }
    finally { setLoadingMore(false); }
  };
  const confirmDelete = async () => {
    const id = confirmDeleteId; setConfirmDeleteId(null);
    try { await api.delete(`/posts/${id}`); setPosts((prev) => prev?.filter((p) => p.id !== id)); showToast('Post deleted'); }
    catch { showToast('Could not delete post'); }
  };

  return <div className="mx-auto w-full max-w-[1180px] px-3 pb-24 pt-7 sm:px-4 sm:pt-8 lg:px-6 lg:pt-12">
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,560px)_280px] lg:justify-center xl:grid-cols-[minmax(0,580px)_300px]">
      <main className="min-w-0">
        <div className="mb-6 flex items-end justify-between px-1 sm:px-0">
          <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.22em] text-emberly-blue">Your circle</p><h1 className="font-display text-2xl font-semibold tracking-tight text-emberly-ivory sm:text-[28px]">Good morning, {user?.fullName?.split(' ')[0] || 'there'}.</h1></div>
          <Link to="/explore" className="hidden items-center gap-2 rounded-full border border-emberly-ivory/10 px-3.5 py-2 text-xs font-semibold text-emberly-ivory/70 transition hover:border-emberly-blue/40 hover:text-emberly-ivory sm:flex"><Compass size={15} /> Explore</Link>
        </div>
        <div className="mb-5"><StoriesRow /></div>
        <div className="space-y-5">
          {posts === null && <><FeedSkeleton /><FeedSkeleton /></>}
          {posts?.length === 0 && <div className="rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-soft/45 p-7 text-center sm:p-8"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emberly-crimson text-emberly-ivory"><Sparkles size={20} /></div><h2 className="font-display text-xl font-semibold">Your feed is waiting.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-emberly-ivory/55">Follow a few people or share your first moment to make this space yours.</p><Link to="/explore" className="mt-5 inline-flex items-center gap-2 rounded-full bg-emberly-crimson px-4 py-2.5 text-xs font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark"><Compass size={14} /> Discover people</Link></div>}
          {posts?.map((post) => <div key={post.id} className="emberly-feed-item"><PostCard post={post} currentUser={user} onLike={handleLike} onComment={(p) => setCommentsPostId(p.id)} onDelete={(p) => setConfirmDeleteId(p.id)} /></div>)}
        </div>
        {nextBefore && <div className="flex justify-center py-7"><button type="button" onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-full border border-emberly-ivory/15 px-5 py-2.5 text-xs font-bold text-emberly-ivory/80 transition hover:border-emberly-blue/50 hover:bg-emberly-ivory/5 disabled:opacity-50">{loadingMore ? 'Loading…' : <><Plus size={14} /> Load more</>}</button></div>}
      </main>
      {ownPostCount === 0 && <aside className="hidden lg:block">
        <div className="sticky top-7 space-y-5">
          <div className="rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-soft/35 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emberly-blue">A little direction</p>
            <p className="mt-3 font-display text-lg leading-snug">Find something worth staying for.</p>
            <p className="mt-2 text-xs leading-5 text-emberly-ivory/50">Explore people, images and conversations outside your usual circle.</p>
            <Link to="/explore" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emberly-crimson-soft hover:text-emberly-ivory"><Compass size={14} /> Open Explore</Link>
          </div>
          <div className="rounded-2xl bg-emberly-ivory p-5 text-emberly-navy"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emberly-crimson">Make something</p><p className="mt-2 font-display text-xl leading-tight">Your next post can change the room.</p><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('emberly:open-create'))} className="mt-4 inline-flex items-center gap-2 rounded-full bg-emberly-crimson px-4 py-2.5 text-xs font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark"><Plus size={14} /> Create post</button></div>
        </div>
      </aside>}
    </div>
    {commentsPostId && <CommentsModal postId={commentsPostId} onClose={() => setCommentsPostId(null)} onCountChange={(count) => handleCommentCountChange(commentsPostId, count)} />}
    <ConfirmDialog open={Boolean(confirmDeleteId)} title="Delete this post?" description="This post will be permanently removed." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
  </div>;
}
