import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { BookmarkIcon } from '../components/icons';

export default function Saved() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/posts/saved')
      .then((res) => { if (!cancelled) setPosts(res.data.posts || []); })
      .catch(() => { if (!cancelled) { setPosts([]); setError('Your saved posts could not be loaded.'); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:px-8 lg:pt-10">
      <header className="mb-5 overflow-hidden rounded-[28px] border border-emberly-ivory/10 bg-emberly-ivory text-emberly-navy sm:mb-6">
        <div className="relative px-5 py-7 sm:px-7 sm:py-8">
          <div className="absolute right-5 top-5 h-20 w-20 rounded-full border-[12px] border-emberly-crimson/15" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.28em] text-emberly-crimson">Your collection</p>
          <div className="relative mt-2 flex items-end justify-between gap-4">
            <div><h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Saved</h1><p className="mt-1 text-sm text-emberly-ink/55">Keep the moments worth coming back to.</p></div>
            {posts && <span className="hidden rounded-full bg-emberly-blue/20 px-3 py-1.5 text-xs font-bold sm:inline-flex">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>}
          </div>
        </div>
      </header>

      {error && <div className="mb-4 rounded-2xl border border-emberly-crimson/25 bg-emberly-crimson/10 px-4 py-4 text-sm text-emberly-crimson-soft">{error}</div>}

      {posts === null && <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-emberly-ivory/[0.06]" />)}</div>}

      {posts && posts.length === 0 && !error && (
        <div className="mx-auto max-w-md rounded-[28px] border border-dashed border-emberly-ivory/12 bg-emberly-navy-soft/40 px-6 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emberly-crimson/12 text-emberly-crimson-soft"><BookmarkIcon className="h-6 w-6" /></div>
          <h2 className="mt-5 font-display text-xl font-semibold text-emberly-ivory">Nothing saved yet.</h2>
          <p className="mt-2 text-sm leading-6 text-emberly-ivory/45">When you find something you want to revisit, save it and it will live here.</p>
          <Link to="/explore" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-emberly-crimson px-4 text-sm font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark">Explore Emberly</Link>
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, delay: Math.min(i * .025, .25) }}>
              <Link to={`/post/${post.id}`} className="group relative block aspect-square overflow-hidden rounded-lg bg-emberly-navy-soft outline-none ring-offset-2 ring-offset-emberly-navy focus-visible:ring-2 focus-visible:ring-emberly-blue sm:rounded-xl">
                {post.media?.[0]?.resourceType === 'video' ? <video src={post.media[0].url} muted playsInline preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" aria-label={post.caption || 'Saved video'} /> : <img src={post.imageUrl} alt={post.caption || 'Saved post'} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" loading="lazy" />}
                <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-emberly-navy/75 text-emberly-ivory opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"><BookmarkIcon className="h-4 w-4" filled /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
