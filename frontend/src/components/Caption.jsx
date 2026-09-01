import { Link } from 'react-router-dom';

const TOKEN_RE = /([#@][a-zA-Z0-9_.]+)/g;

function renderTokens(text) {
  const parts = text.split(TOKEN_RE);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <Link key={i} to={`/explore/tags/${part.slice(1).toLowerCase()}`} className="text-emberly-crimson-soft font-medium hover:underline">
          {part}
        </Link>
      );
    }
    if (part.startsWith('@')) {
      return (
        <Link key={i} to={`/${part.slice(1)}`} className="text-emberly-crimson-soft font-medium hover:underline">
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Caption({ username, text, expanded, onToggle, limit = 90 }) {
  if (!text) return null;
  const isLong = text.length > limit;
  const shown = expanded || !isLong ? text : text.slice(0, limit).trimEnd() + '…';

  return (
    <p className="text-sm leading-relaxed">
      <span className="font-medium mr-1.5">{username}</span>
      {renderTokens(shown)}
      {isLong && (
        <button
          onClick={onToggle}
          className="ml-1.5 text-emberly-ivory/40 hover:text-emberly-ivory transition-colors"
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </p>
  );
}
