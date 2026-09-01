// A small, consistent icon set (1.8px stroke, 24px viewbox) so every icon in
// Emberly shares the same visual language rather than mixing icon libraries.

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function HomeIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function CompassIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.8 9.2-1.8 4.8-4.8 1.8 1.8-4.8z" />
    </svg>
  );
}

export function BellIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function MessageIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.9A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </svg>
  );
}

export function PlusSquareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function UserIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  );
}

export function HeartIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 21s-6.7-4.35-9.3-8.2C.9 10.1 1.4 6.6 4.2 4.9c2.3-1.4 5.1-.8 6.8 1.2.5.6.9 1.2 1 1.3.1-.1.5-.7 1-1.3 1.7-2 4.5-2.6 6.8-1.2 2.8 1.7 3.3 5.2 1.5 7.9C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

export function CommentIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.9A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </svg>
  );
}

export function ShareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m3 11 17-7-7 17-2.5-7.5L3 11Z" />
    </svg>
  );
}

export function BookmarkIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function MoreIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function SettingsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l1.9-1.5-2-3.4-2.3.7a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.3a8 8 0 0 0-1.7 1l-2.3-.7-2 3.4L6.6 11a7.97 7.97 0 0 0 0 2l-1.9 1.5 2 3.4 2.3-.7a8 8 0 0 0 1.7 1l.3 2.3h4l.3-2.3a8 8 0 0 0 1.7-1l2.3.7 2-3.4Z" />
    </svg>
  );
}

export function LogOutIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function XIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function LockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

export function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function LinkIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10a4 4 0 0 0-5.7 0L5.7 12.6a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </svg>
  );
}

export function CameraIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.6a1 1 0 0 0 .87-.5l.66-1.15A1 1 0 0 1 9.5 4.8h5a1 1 0 0 1 .87.5l.66 1.15a1 1 0 0 0 .87.5h1.6A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function ChevronRightIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function UsersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M16 20v-1.2a4.3 4.3 0 0 0-4.3-4.3H7.3A4.3 4.3 0 0 0 3 18.8V20" />
      <circle cx="9.5" cy="7.5" r="3.2" />
      <path d="M16 11.2a3.2 3.2 0 1 0-1.1-6.2M21 20v-1.2a4.3 4.3 0 0 0-3.2-4.1" />
    </svg>
  );
}
