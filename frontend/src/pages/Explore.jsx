import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Heart, MessageCircle, Play, Hash } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Tile({ post, index }) {
  const media = post.media?.[0];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: Math.min(index * .025, .25) }}>
      <Link to={`/post/${post.id}`} className="group relative block aspect-square min-h-0 overflow-hidden bg-emberly-navy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue md:min-h-0">
        {media?.resourceType === 'video' ? <video src={media.url} muted playsInline preload="none" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" /> : <img src={post.imageUrl || media?.url} alt={post.caption || 'Post'} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emberly-navy/85 to-transparent opacity-70" />
        <div className="absolute inset-0 flex items-end justify-between p-3 opacity-0 transition duration-200 group-hover:opacity-100">
          <div className="flex gap-4 text-sm font-semibold text-white"><span className="flex items-center gap-1.5"><Heart className="h-4 w-4 fill-current" />{post.likeCount}</span><span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />{post.commentCount}</span></div>
          {media?.resourceType === 'video' && <Play className="h-4 w-4 text-white" />}
        </div>
        {media?.resourceType === 'video' && <span className="absolute right-3 top-3 rounded-full bg-emberly-navy/80 p-1.5 text-white"><Play className="h-3.5 w-3.5 fill-current" /></span>}
      </Link>
    </motion.div>
  );
}

export default function Explore() {
  const [posts, setPosts] = useState(null);
  const [nextBefore, setNextBefore] = useState(null);
  const { tag } = useParams();
  const [loadingMore, setLoadingMore] = useState(false);
  const [ownPostCount, setOwnPostCount] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    setPosts(null); setNextBefore(null);
    const endpoint = tag ? `/posts/tag/${encodeURIComponent(tag)}` : '/posts/explore';
    api.get(endpoint).then(res => { setPosts(res.data.posts || []); setNextBefore(res.data.nextBefore || null); }).catch(() => setPosts([]));
  }, [tag]);

  useEffect(() => {
    if (!user?.username) {
      setOwnPostCount(0);
      return;
    }

    api.get(`/users/${encodeURIComponent(user.username)}`)
      .then((res) => setOwnPostCount(Number(res.data.postCount || 0)))
      .catch(() => setOwnPostCount(0));
  }, [user?.username]);

  const loadMore = async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try { const endpoint = tag ? `/posts/tag/${encodeURIComponent(tag)}` : '/posts/explore'; const res = await api.get(endpoint, { params: { before: nextBefore, limit: 30 } }); setPosts(prev => [...(prev || []), ...(res.data.posts || [])]); setNextBefore(res.data.nextBefore || null); }
    finally { setLoadingMore(false); }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-7 pb-24 sm:px-5 lg:px-8 lg:py-10">
      {((tag) || ownPostCount === 0) && <header className="mb-5 overflow-hidden rounded-[24px] border border-white/10 bg-emberly-ivory text-emberly-ink">
        <div className="grid md:grid-cols-[1fr_150px]">
          <div className="px-5 py-4 sm:px-6 sm:py-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emberly-crimson"><Search className="h-4 w-4" /> Discover</div><h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{tag ? `#${tag}` : 'Find something new.'}</h1><p className="mt-2 max-w-xl text-sm leading-5 text-emberly-ink/65">{tag ? `A visual collection of posts tagged #${tag}.` : 'A considered mix of moments, people and ideas from the Emberly community.'}</p></div>
          <div className="hidden bg-emberly-crimson p-4 text-emberly-ivory md:flex md:flex-col md:justify-between"><Hash className="h-7 w-7" /><p className="font-display text-lg leading-tight">Look closer.<br />Stay curious.</p></div>
        </div>
      </header>}

      {posts === null && <div className="grid grid-cols-3 gap-1 sm:gap-1.5">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse bg-emberly-navy-soft" />)}</div>}
      {posts?.length === 0 && <div className="rounded-2xl border border-white/10 bg-emberly-navy-soft/60 py-20 text-center"><Search className="mx-auto h-7 w-7 text-emberly-blue" /><h2 className="mt-4 font-display text-xl font-semibold">Nothing surfaced yet</h2><p className="mt-1 text-sm text-emberly-blue-soft">Try another search or check back later.</p></div>}
      {posts?.length > 0 && <div className="emberly-media-grid grid grid-cols-3 gap-1 sm:gap-1.5">{posts.map((post, i) => <Tile key={post.id} post={post} index={i} />)}</div>}
      {posts?.length > 0 && nextBefore && <div className="flex justify-center py-8"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-white/15 bg-emberly-navy-soft px-5 py-2.5 text-sm font-semibold text-emberly-ivory transition hover:border-emberly-blue/60 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load more'}</button></div>}
    </main>
  );
}
