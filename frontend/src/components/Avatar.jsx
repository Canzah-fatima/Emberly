export default function Avatar({ user, size = 40, ring = false }) {
  if (!user) return null;
  const initials = (user.fullName || user.username || '?').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.38 };
  const ringClass = ring ? 'ring-2 ring-emberly-ivory ring-offset-2 ring-offset-emberly-navy' : '';
  if (user.avatarUrl) return <img src={user.avatarUrl} alt={user.username} loading="lazy" decoding="async" style={style} className={`shrink-0 rounded-full object-cover ${ringClass}`} />;
  return <div style={{ ...style, background: user.avatarColor || '#C11720' }} className={`flex shrink-0 items-center justify-center rounded-full border border-white/10 font-display font-bold text-emberly-ivory ${ringClass}`} aria-label={user.username}>{initials}</div>;
}
