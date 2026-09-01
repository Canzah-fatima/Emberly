import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import { SearchIcon, XIcon } from '../components/icons';

const RECENT_KEY = 'emberly:recent-searches';
const MAX_RECENT = 5;

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter(Boolean).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export default function Search() {
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setUsers(null);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setError('');
        const res = await api.get(`/users/search?q=${encodeURIComponent(trimmed)}`);
        if (!cancelled) setUsers(res.data.users || []);
      } catch {
        if (!cancelled) {
          setUsers([]);
          setError('Search is unavailable right now.');
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const saveRecent = (value) => {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recent.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage can be unavailable */ }
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  };

  const clear = () => setQuery('');

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-12">
      <section className="overflow-hidden rounded-[26px] border border-emberly-ivory/10 bg-emberly-navy-soft/55 shadow-[0_24px_70px_rgba(0,0,0,.18)]">
        <div className="relative border-b border-emberly-navy/10 bg-emberly-ivory px-5 py-6 text-emberly-navy sm:px-7 sm:py-7">
          <div className="absolute right-0 top-0 h-20 w-20 translate-x-7 -translate-y-7 rounded-full bg-emberly-blue/25" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.28em] text-emberly-crimson">Discover</p>
          <h1 className="relative mt-1.5 font-display text-[28px] font-semibold tracking-tight sm:text-3xl">Find your people.</h1>
          <p className="relative mt-1.5 max-w-md text-sm leading-6 text-emberly-ink/60">Search by name or username and discover the people behind the moments.</p>
        </div>

        <div className="p-4 sm:p-6">
          <label className="sr-only" htmlFor="emberly-search">Search people</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[19px] w-[19px] -translate-y-1/2 text-emberly-blue" />
            <input
              id="emberly-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) saveRecent(query); }}
              placeholder="Search people"
              autoComplete="off"
              className="h-13 w-full rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep/70 pl-12 pr-12 text-sm font-medium text-emberly-ivory outline-none transition placeholder:text-emberly-ivory/35 focus:border-emberly-blue focus:ring-4 focus:ring-emberly-blue/10"
            />
            {query && (
              <button type="button" onClick={clear} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-emberly-ivory/50 transition hover:bg-emberly-ivory/10 hover:text-emberly-ivory" aria-label="Clear search">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-5">
            {!query && recent.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emberly-blue/80">Recent searches</p>
                  <button type="button" onClick={clearRecent} className="text-xs font-semibold text-emberly-crimson-soft transition hover:text-emberly-ivory">Clear</button>
                </div>
                <div className="space-y-1">
                  {recent.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-emberly-ivory/[0.045]"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emberly-blue/10 text-emberly-blue"><SearchIcon className="h-4 w-4" /></span>
                      <span className="truncate text-sm text-emberly-ivory/75">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!query && recent.length === 0 && (
              <div className="rounded-2xl border border-dashed border-emberly-ivory/12 px-5 py-9 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emberly-blue/10 text-emberly-blue"><SearchIcon className="h-5 w-5" /></div>
                <p className="mt-4 text-sm font-semibold text-emberly-ivory">Start with a name or username</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-emberly-ivory/45">Your results will appear here as you type.</p>
              </div>
            )}

            {query && users === null && (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-emberly-ivory/[0.045]" />)}
              </div>
            )}

            {query && error && <div className="rounded-2xl border border-emberly-crimson/25 bg-emberly-crimson/10 px-4 py-4 text-sm text-emberly-crimson-soft">{error}</div>}

            {query && users && users.length === 0 && !error && (
              <div className="rounded-2xl border border-dashed border-emberly-ivory/12 px-5 py-10 text-center">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emberly-navy-soft text-emberly-blue"><SearchIcon className="h-5 w-5" /></div>
                <p className="mt-4 text-sm font-semibold text-emberly-ivory">No people found</p>
                <p className="mt-1 text-xs text-emberly-ivory/45">Try a different spelling or username.</p>
              </div>
            )}

            <div className="space-y-1">
              {query && users?.map((u) => (
                <div key={u.id} className="group flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-emberly-ivory/[0.045]">
                  <Link onClick={() => saveRecent(u.username)} to={`/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue">
                    <Avatar user={u} size={48} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-emberly-ivory">{u.username}</p>
                      <p className="mt-0.5 truncate text-xs text-emberly-ivory/45">{u.fullName || 'Emberly member'}</p>
                    </div>
                  </Link>
                  {me && me.username !== u.username && <FollowButton username={u.username} initialRelationship={u.relationship} isPrivateTarget={u.isPrivate} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
