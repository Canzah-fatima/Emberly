import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Avatar from './Avatar';
import CreatePostModal from './CreatePostModal';
import { HomeIcon, SearchIcon, CompassIcon, BellIcon, PlusSquareIcon, MessageIcon } from './icons';

const navClass = 'grid h-full flex-1 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emberly-blue';

function ItemIcon({ active, children, badge }) {
  return (
    <span className={`relative grid h-10 w-10 place-items-center rounded-[14px] transition ${active ? 'bg-emberly-ivory text-emberly-navy' : 'text-emberly-ivory/58'}`}>
      {children}
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-emberly-crimson px-1 text-[8px] font-black text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const { unreadCount, requestCount, messageCount } = useNotifications();
  const [createOpen, setCreateOpen] = useState(false);
  const badge = unreadCount + requestCount;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-[4.75rem] border-t border-emberly-ivory/[0.10] bg-emberly-navy/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        <NavLink to="/" end className={navClass} aria-label="Home">
          {({ isActive }) => <ItemIcon active={isActive}><HomeIcon className="h-[19px] w-[19px]" filled={isActive} /></ItemIcon>}
        </NavLink>

        <NavLink to="/search" className={navClass} aria-label="Search">
          {({ isActive }) => <ItemIcon active={isActive}><SearchIcon className="h-[19px] w-[19px]" /></ItemIcon>}
        </NavLink>

        <button type="button" onClick={() => setCreateOpen(true)} className={navClass} aria-label="Create post">
          <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-emberly-crimson text-emberly-ivory shadow-[0_12px_26px_rgba(193,23,32,0.28)] transition active:scale-95">
            <PlusSquareIcon className="h-[20px] w-[20px]" />
          </span>
        </button>

        <NavLink to="/explore" className={navClass} aria-label="Explore">
          {({ isActive }) => <ItemIcon active={isActive}><CompassIcon className="h-[19px] w-[19px]" filled={isActive} /></ItemIcon>}
        </NavLink>

        <NavLink to="/notifications" className={navClass} aria-label="Notifications">
          {({ isActive }) => <ItemIcon active={isActive} badge={badge}><BellIcon className="h-[19px] w-[19px]" filled={isActive} /></ItemIcon>}
        </NavLink>

        <NavLink to="/messages" className={navClass} aria-label="Messages">
          {({ isActive }) => <ItemIcon active={isActive} badge={messageCount}><MessageIcon className="h-[19px] w-[19px]" /></ItemIcon>}
        </NavLink>

        <NavLink to={`/${user.username}`} className={navClass} aria-label="Profile">
          {({ isActive }) => <span className={`rounded-full p-0.5 transition ${isActive ? 'bg-emberly-ivory' : ''}`}><Avatar user={user} size={29} ring={false} /></span>}
        </NavLink>
      </nav>

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
