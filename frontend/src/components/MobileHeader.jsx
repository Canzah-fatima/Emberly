import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { BellIcon, SettingsIcon, ChevronLeftIcon, SearchIcon, MoreIcon, BookmarkIcon } from './icons';

const routeMeta = {
  '/messages': 'Messages',
  '/explore': 'Explore',
  '/notifications': 'Notifications',
  '/saved': 'Saved',
  '/settings': 'Settings',
  '/search': 'Search',
};

function ActionButton({ to, label, children, badge }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative grid h-10 w-10 place-items-center rounded-[13px] border border-emberly-ivory/[0.10] bg-emberly-ivory/[0.045] text-emberly-ivory/75 transition hover:border-emberly-blue/40 hover:bg-emberly-blue/[0.10] hover:text-emberly-ivory"
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-emberly-crimson px-1 text-[8px] font-black text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

export default function MobileHeader() {
  const { pathname } = useLocation();

  // Messages owns its mobile header because its two-pane layout has
  // a dedicated conversation/list header. Rendering the global header
  // here would duplicate both the title and message action.
  if (pathname === '/messages') return null;
  const { user } = useAuth();
  const { unreadCount, requestCount } = useNotifications();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const badge = unreadCount + requestCount;

  const isRoot = pathname === '/';
  const isOwnProfile = pathname === `/${user.username}`;
  const isPrimary = isRoot || ['/explore', '/notifications', '/search'].includes(pathname);
  const title = isRoot ? null : routeMeta[pathname] || (isOwnProfile ? user.username : 'Emberly');

  return (
    <header className="sticky top-0 z-30 border-b border-emberly-ivory/[0.09] bg-emberly-navy/94 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!isPrimary && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-emberly-ivory/[0.10] bg-emberly-ivory/[0.045] text-emberly-ivory/75 transition hover:border-emberly-blue/40 hover:text-emberly-ivory"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}

          {isRoot ? (
            <div>
              <div className="font-display text-[24px] font-bold leading-none tracking-[-0.055em] text-emberly-ivory">Emberly</div>
              <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.28em] text-emberly-blue">Moments, made yours</div>
            </div>
          ) : (
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-bold tracking-[-0.01em] text-emberly-ivory">{title}</span>
              {pathname.startsWith('/explore/tags/') && <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-emberly-blue">Discovery</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(isRoot || pathname === '/explore') && <ActionButton to="/search" label="Search"><SearchIcon className="h-5 w-5" /></ActionButton>}
          {isOwnProfile && <ActionButton to="/settings" label="Settings"><SettingsIcon className="h-5 w-5" /></ActionButton>}
          {isRoot && <ActionButton to="/notifications" label="Notifications" badge={badge}><BellIcon className="h-5 w-5" /></ActionButton>}
          {(isRoot || isOwnProfile) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-[13px] border border-emberly-ivory/[0.10] bg-emberly-ivory/[0.045] text-emberly-ivory/75 transition hover:border-emberly-blue/40 hover:bg-emberly-blue/[0.10] hover:text-emberly-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue"
                aria-label="More options"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              {moreOpen && (
                <div role="menu" className="absolute right-0 top-12 w-44 overflow-hidden rounded-2xl border border-emberly-ivory/[0.12] bg-emberly-navy-soft p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
                  <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); navigate('/saved'); }} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-emberly-ivory/75 hover:bg-emberly-ivory/[0.06] hover:text-emberly-ivory">
                    <BookmarkIcon className="h-[18px] w-[18px]" /> Saved
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); navigate('/settings'); }} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-emberly-ivory/75 hover:bg-emberly-ivory/[0.06] hover:text-emberly-ivory">
                    <SettingsIcon className="h-[18px] w-[18px]" /> Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
