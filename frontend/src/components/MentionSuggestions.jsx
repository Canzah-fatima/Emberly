import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

export function getMentionQuery(value, caret) {
  const before = value.slice(0, caret);
  const match = before.match(/(^|\s)@([a-zA-Z0-9_.]*)$/);
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1, end: caret };
}

export default function MentionSuggestions({ value, caret, onSelect }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const token = useMemo(() => getMentionQuery(value, caret), [value, caret]);

  useEffect(() => {
    if (!token) {
      setUsers([]);
      setActiveIndex(0);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get('/users/search', { params: { q: token.query } });
        if (!cancelled) {
          setUsers((res.data.users || []).slice(0, 6));
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token?.query]);

  useEffect(() => {
    if (!token || !users.length) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % users.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + users.length) % users.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const user = users[activeIndex] || users[0];
        if (user && token) onSelect?.(user, token);
      } else if (event.key === 'Escape') {
        setUsers([]);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [token, users, activeIndex, onSelect]);

  if (!token || (!loading && users.length === 0)) return null;

  return (
    <div className="absolute inset-x-0 bottom-full z-40 mb-2 overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.35)]" role="listbox" aria-label="Mention someone">
      {loading && <div className="px-3 py-3 text-xs text-emberly-ivory/45">Finding people…</div>}
      {!loading && users.map((user, index) => (
        <button
          type="button"
          key={user.id}
          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${index === activeIndex ? 'bg-emberly-ivory/10' : 'hover:bg-emberly-ivory/5'}`}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect?.(user, token)}
          role="option"
          aria-selected={index === activeIndex}
        >
          <Avatar user={user} size={32} />
          <span className="min-w-0 text-left">
            <strong className="block truncate text-sm">@{user.username}</strong>
            <span className="block truncate text-xs text-emberly-ivory/40">{user.fullName}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
