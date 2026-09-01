import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useNotifications } from '../context/NotificationsContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import { BellIcon, HeartIcon, CommentIcon, UserIcon, CheckIcon, XIcon } from '../components/icons';

function timeAgo(dateStr) {
  const diff = Math.max(0, (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

function actionText(n) {
  switch (n.type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'comment_like': return 'liked your comment';
    case 'comment_reply': return 'replied to your comment';
    case 'mention': return 'mentioned you';
    case 'follow': return 'started following you';
    case 'follow_request': return 'requested to follow you';
    case 'follow_accept': return 'accepted your follow request';
    default: return 'interacted with you';
  }
}

function iconFor(type) {
  if (type === 'like' || type === 'comment_like') return <HeartIcon filled className="h-3.5 w-3.5" />;
  if (type === 'comment' || type === 'comment_reply') return <CommentIcon className="h-3.5 w-3.5" />;
  return <UserIcon className="h-3.5 w-3.5" />;
}

function groupByRecency(items) {
  const today = [], week = [], earlier = [], now = Date.now();
  items.forEach((n) => {
    const days = (now - new Date(n.createdAt + 'Z').getTime()) / 86400000;
    if (days < 1) today.push(n);
    else if (days < 7) week.push(n);
    else earlier.push(n);
  });
  return { today, week, earlier };
}

function Row({ n }) {
  const destination = n.post ? `/post/${n.post.id}` : `/${n.actor.username}`;
  return (
    <Link
      to={destination}
      className={`group flex min-w-0 items-center gap-3 px-4 py-3.5 transition hover:bg-emberly-navy-soft/55 ${!n.read ? 'bg-emberly-crimson/5' : ''}`}
    >
      <div className="relative shrink-0">
        <Avatar user={n.actor} size={40} />
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-emberly-navy bg-emberly-crimson text-emberly-ivory">
          {iconFor(n.type)}
        </span>
      </div>
      <p className="min-w-0 flex-1 text-[13px] leading-5">
        <span className="font-semibold text-emberly-ivory">{n.actor.username}</span>{' '}
        <span className="text-emberly-ivory/75">{actionText(n)}</span>{' '}
        <span className="text-emberly-ivory/40">{timeAgo(n.createdAt)}</span>
      </p>
      {n.post && <img src={n.post.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-emberly-ivory/10 transition group-hover:ring-emberly-blue/60" />}
    </Link>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h2 className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emberly-blue/80">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep/35">{children}</div>
    </section>
  );
}

export default function Notifications() {
  const { markAllRead, refresh } = useNotifications();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(null);
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [notificationRes, requestRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/users/me/follow-requests'),
      ]);
      setNotifications(notificationRes.data.notifications || []);
      setRequests(requestRes.data.requests || []);
    } catch {
      setError('Activity is unavailable right now.');
      setNotifications((current) => current ?? []);
      setRequests((current) => current ?? []);
    }
  };

  useEffect(() => {
    load();
    markAllRead();
  }, [markAllRead]);

  const respond = async (username, action) => {
    const previous = requests || [];
    setRequests((current) => (current || []).filter((r) => r.username !== username));
    try {
      await api.post(`/users/me/follow-requests/${username}/${action}`);
      showToast(action === 'accept' ? `Accepted @${username}` : `Declined @${username}`);
      refresh();
    } catch {
      setRequests(previous);
      showToast('Something went wrong', { tone: 'error' });
    }
  };

  const groups = useMemo(() => groupByRecency(notifications || []), [notifications]);
  const empty = notifications?.length === 0 && (!requests || requests.length === 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-8 sm:px-6 lg:pb-12 lg:pt-12">
      <header className="mb-7 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emberly-crimson-soft">Activity</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-emberly-ivory">Notifications</h1>
          <p className="mt-1 text-sm text-emberly-ivory/45">The moments that need your attention.</p>
        </div>
        <div className="hidden h-12 w-12 place-items-center rounded-2xl bg-emberly-crimson text-emberly-ivory sm:grid"><BellIcon className="h-5 w-5" /></div>
      </header>

      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-emberly-crimson/25 bg-emberly-crimson/10 px-4 py-3 text-sm text-emberly-crimson-soft">
          <span>{error}</span>
          <button type="button" onClick={load} className="shrink-0 rounded-full border border-emberly-crimson/30 px-3 py-1.5 text-xs font-semibold text-emberly-ivory hover:bg-emberly-crimson/10">Retry</button>
        </div>
      )}

      {requests?.length > 0 && (
        <Section title="Follow requests">
          {requests.map((r) => (
            <div key={r.username} className="flex items-center gap-3 px-4 py-3.5">
              <Avatar user={r} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-emberly-ivory"><b>{r.username}</b> <span className="text-emberly-ivory/55">wants to follow you</span></p>
              </div>
              <button type="button" onClick={() => respond(r.username, 'accept')} aria-label={`Accept ${r.username}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emberly-crimson text-emberly-ivory transition hover:bg-emberly-crimson-dark"><CheckIcon className="h-4 w-4" /></button>
              <button type="button" onClick={() => respond(r.username, 'decline')} aria-label={`Decline ${r.username}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emberly-ivory/15 text-emberly-ivory/65 transition hover:border-emberly-blue hover:text-emberly-ivory"><XIcon className="h-4 w-4" /></button>
            </div>
          ))}
        </Section>
      )}

      {notifications === null && (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep/50" />)}
        </div>
      )}

      {empty && (
        <div className="rounded-3xl border border-emberly-ivory/10 bg-emberly-navy-deep/40 px-6 py-20 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emberly-crimson/15 text-emberly-crimson-soft"><BellIcon className="h-6 w-6" /></div>
          <h2 className="font-display text-xl text-emberly-ivory">You're all caught up.</h2>
          <p className="mt-1 text-sm text-emberly-ivory/50">New activity on your posts will show up here.</p>
        </div>
      )}

      {groups.today.length > 0 && <Section title="Today">{groups.today.map((n) => <Row key={n.id} n={n} />)}</Section>}
      {groups.week.length > 0 && <Section title="This week">{groups.week.map((n) => <Row key={n.id} n={n} />)}</Section>}
      {groups.earlier.length > 0 && <Section title="Earlier">{groups.earlier.map((n) => <Row key={n.id} n={n} />)}</Section>}
    </main>
  );
}
