import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Avatar from './Avatar';
import CreatePostModal from './CreatePostModal';
import {
  HomeIcon,
  SearchIcon,
  CompassIcon,
  BellIcon,
  PlusSquareIcon,
  MessageIcon,
  MoreIcon,
  SettingsIcon,
  LogOutIcon,
  BookmarkIcon,
  ChevronLeftIcon,
} from './icons';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/search', label: 'Search', icon: SearchIcon },
  { to: '/explore', label: 'Explore', icon: CompassIcon },
  { to: '/messages', label: 'Messages', icon: MessageIcon, badge: 'messages' },
  { to: '/notifications', label: 'Notifications', icon: BellIcon, badge: 'notifications' },
];

const itemBase =
  'group relative flex min-h-12 w-full items-center gap-3 rounded-[18px] px-3 text-left text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue';

function BrandMark() {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] shadow-[0_14px_32px_rgba(0,0,0,0.24)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" className="h-full w-full" focusable="false">
        <rect width="44" height="44" rx="14" fill="#C11720" />
        <path
          d="M27.5 0H44v22.5c0 8.2-6.3 14.7-14.4 15.2l-6.1-6.2c6.4-1.7 10.4-5.5 10.4-11.7 0-5.6-2.8-9.6-8.4-11.8L27.5 0Z"
          fill="#6FA6C4"
        />
        <path
          d="M14 12.5h12.2v3.2h-7.9v4.2h7.2v3.1h-7.2v5.2h8.1v3.3H14V12.5Z"
          fill="#FFF1D6"
        />
      </svg>
    </span>
  );
}

function Badge({ count, active = false }) {
  if (!count) return null;
  return (
    <span
      className={`grid min-h-5 min-w-5 place-items-center rounded-full px-1.5 text-[9px] font-extrabold leading-none ${
        active ? 'bg-emberly-navy text-emberly-ivory' : 'bg-emberly-crimson text-white'
      }`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const { unreadCount, requestCount, messageCount } = useNotifications();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener('emberly:open-create', openCreate);
    return () => window.removeEventListener('emberly:open-create', openCreate);
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const notificationBadge = unreadCount + requestCount;

  function badgeFor(kind) {
    if (kind === 'messages') return messageCount;
    if (kind === 'notifications') return notificationBadge;
    return 0;
  }

  function toggleCollapsed() {
    setMoreOpen(false);
    setCollapsed((value) => !value);
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-emberly-ivory/[0.10] bg-emberly-navy lg:flex ${
          collapsed ? 'w-[92px]' : 'w-[272px]'
        }`}
        aria-label="Primary navigation"
      >
        <div className="flex h-full w-full flex-col px-3 py-4">
          <div className={`relative flex h-14 items-center ${collapsed ? 'justify-start' : 'justify-between'} px-1`}>
            <NavLink
              to="/"
              className={`group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue ${
                collapsed ? 'absolute left-1 top-1' : 'px-1'
              }`}
              aria-label="Emberly home"
              title={collapsed ? 'Emberly' : undefined}
            >
              <BrandMark />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block font-display text-[27px] font-bold leading-none tracking-[-0.055em] text-emberly-ivory">
                    Emberly
                  </span>
                  <span className="mt-1.5 block text-[8px] font-extrabold uppercase tracking-[0.30em] text-emberly-blue">
                    Moments, made yours
                  </span>
                </span>
              )}
            </NavLink>

            <button
              type="button"
              onClick={toggleCollapsed}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emberly-ivory/[0.14] bg-emberly-navy-soft/70 text-emberly-ivory/65 shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition hover:border-emberly-blue/60 hover:bg-emberly-navy-soft hover:text-emberly-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue ${
                collapsed ? 'absolute right-1 top-3' : ''
              }`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeftIcon className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="mt-9">
            <nav className="space-y-1.5" aria-label="Main">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => {
                const count = badgeFor(badge);

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `${itemBase} ${collapsed ? 'justify-center px-0' : ''} ${
                        isActive
                          ? collapsed
                            ? 'bg-transparent text-emberly-ivory'
                            : 'bg-emberly-ivory text-emberly-navy shadow-[0_14px_30px_rgba(0,0,0,0.16)]'
                          : 'text-emberly-ivory/62 hover:bg-emberly-ivory/[0.055] hover:text-emberly-ivory'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[13px] transition-all duration-200 ${
                            isActive
                              ? 'bg-emberly-crimson text-emberly-ivory shadow-[0_8px_18px_rgba(193,23,32,0.20)]'
                              : 'bg-emberly-ivory/[0.045] text-emberly-ivory/60 group-hover:bg-emberly-blue/[0.16] group-hover:text-emberly-blue'
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>

                        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                        <Badge count={count} active={isActive} />
                      </>
                    )}
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                title={collapsed ? 'Create' : undefined}
                className={`${itemBase} mt-3 ${
                  collapsed
                    ? 'justify-center bg-transparent px-0 text-emberly-ivory'
                    : 'bg-emberly-crimson text-emberly-ivory shadow-[0_16px_34px_rgba(193,23,32,0.24)] hover:bg-emberly-crimson-dark hover:shadow-[0_18px_38px_rgba(193,23,32,0.32)]'
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-[13px] ${
                    collapsed
                      ? 'bg-emberly-crimson text-emberly-ivory shadow-[0_8px_18px_rgba(193,23,32,0.20)]'
                      : 'bg-emberly-navy/20'
                  }`}
                >
                  <PlusSquareIcon className="h-[18px] w-[18px]" />
                </span>
                {!collapsed && <span>Create</span>}
              </button>

              <NavLink
                to={`/${user.username}`}
                title={collapsed ? 'Profile' : undefined}
                className={({ isActive }) =>
                  `${itemBase} mt-3 ${collapsed ? 'justify-center px-0' : ''} ${
                    isActive
                      ? 'bg-emberly-blue/[0.16] text-emberly-ivory ring-1 ring-emberly-blue/30'
                      : 'text-emberly-ivory/62 hover:bg-emberly-ivory/[0.055] hover:text-emberly-ivory'
                  }`
                }
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${!collapsed ? 'ring-1 ring-emberly-ivory/10' : ''}`}>
                  <Avatar user={user} size={31} ring={false} />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">Profile</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-emberly-blue">@{user.username}</span>
                  </span>
                )}
              </NavLink>
            </nav>
          </div>

          <div className="mt-auto" ref={moreRef}>
            <div className="mb-3 h-px bg-emberly-ivory/[0.10]" />

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className={`absolute bottom-20 ${collapsed ? 'left-[84px] w-56' : 'left-3 right-3'} overflow-hidden rounded-[20px] border border-emberly-ivory/[0.12] bg-emberly-navy-soft p-1.5 shadow-[0_28px_70px_rgba(0,0,0,0.40)]`}
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); navigate('/saved'); }}
                    className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm font-semibold text-emberly-ivory/72 transition hover:bg-emberly-ivory/[0.06] hover:text-emberly-ivory"
                  >
                    <BookmarkIcon className="h-[18px] w-[18px]" />
                    <span>Saved</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); navigate('/settings'); }}
                    className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm font-semibold text-emberly-ivory/72 transition hover:bg-emberly-ivory/[0.06] hover:text-emberly-ivory"
                  >
                    <SettingsIcon className="h-[18px] w-[18px]" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1 h-px bg-emberly-ivory/[0.08]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm font-semibold text-emberly-crimson-soft transition hover:bg-emberly-crimson/[0.12] hover:text-emberly-ivory"
                  >
                    <LogOutIcon className="h-[18px] w-[18px]" />
                    <span>Log out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              aria-expanded={moreOpen}
              title={collapsed ? 'More' : undefined}
              className={`${itemBase} ${collapsed ? 'justify-center px-0' : ''} text-emberly-ivory/48 hover:bg-emberly-ivory/[0.055] hover:text-emberly-ivory`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-emberly-ivory/[0.04]">
                <MoreIcon className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && <span>More</span>}
            </button>
          </div>
        </div>
      </aside>

      {createOpen && (
        <CreatePostModal
          open
          onClose={() => setCreateOpen(false)}
          currentUser={user}
          onCreated={(post) => window.dispatchEvent(new CustomEvent('emberly:post-created', { detail: post }))}
        />
      )}
    </>
  );
}
