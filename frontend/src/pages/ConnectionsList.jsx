import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import { SearchIcon, UsersIcon } from '../components/icons';

export default function ConnectionsList() {
  const { username } = useParams();
  const { pathname } = useLocation();
  const { user: me } = useAuth();
  const mode = pathname.endsWith('/followers') ? 'followers' : 'following';
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setUsers(null);
    setError('');
    api.get(`/users/${username}/${mode}`)
      .then((res) => { if (!cancelled) setUsers(res.data.users || []); })
      .catch(() => { if (!cancelled) { setUsers([]); setError('Could not load this list.'); } });
    return () => { cancelled = true; };
  }, [username, mode]);

  const filtered = useMemo(() => users?.filter((u) => {
    const q = query.trim().toLowerCase();
    return !q || u.username?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q);
  }), [users, query]);

  const title = mode === 'followers' ? 'Followers' : 'Following';

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <section className="overflow-hidden rounded-[28px] border border-emberly-ivory/10 bg-emberly-navy-soft/50 shadow-[0_24px_70px_rgba(0,0,0,.16)]">
        <header className="bg-emberly-ivory px-5 py-7 text-emberly-navy sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emberly-crimson">Connections</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-emberly-ink/55">@{username}</p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emberly-blue/20 text-emberly-navy"><UsersIcon className="h-5 w-5" /></div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-emberly-blue" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="h-12 w-full rounded-2xl border border-emberly-ivory/12 bg-emberly-navy-deep/70 pl-11 pr-4 text-sm text-emberly-ivory outline-none transition focus:border-emberly-blue focus:ring-4 focus:ring-emberly-blue/10 placeholder:text-emberly-ivory/35" />
          </div>

          <div className="mt-4">
            {users === null && <div className="space-y-2">{[0,1,2,3,4].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-emberly-ivory/[0.045]" />)}</div>}
            {error && <div className="rounded-2xl border border-emberly-crimson/25 bg-emberly-crimson/10 px-4 py-4 text-sm text-emberly-crimson-soft">{error}</div>}
            {users && !error && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-emberly-ivory/12 px-5 py-12 text-center"><p className="text-sm font-semibold text-emberly-ivory">{query ? 'No matching people' : mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</p><p className="mt-1 text-xs text-emberly-ivory/45">{query ? 'Try a different search.' : 'Connections will appear here.'}</p></div>}
            <div className="space-y-1">
              {filtered?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-emberly-ivory/[0.045]">
                  <Link to={`/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue">
                    <Avatar user={u} size={48} />
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-emberly-ivory">{u.username}</p><p className="mt-0.5 truncate text-xs text-emberly-ivory/45">{u.fullName || 'Emberly member'}</p></div>
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
