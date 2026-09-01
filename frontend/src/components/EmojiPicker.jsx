import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Smile, UserRound, PawPrint, Utensils, Plane, Trophy, Lightbulb, Shapes, Clock3, Grid2X2 } from 'lucide-react';

const CATEGORY_RANGES = {
  Smileys: [[0x1f600, 0x1f64f]],
  People: [[0x1f466, 0x1f487], [0x1f574, 0x1f5ff]],
  Animals: [[0x1f400, 0x1f43f], [0x1f980, 0x1f9ae]],
  Food: [[0x1f32d, 0x1f37f], [0x1f950, 0x1f96f]],
  Travel: [[0x1f680, 0x1f6ff]],
  Activities: [[0x1f3a0, 0x1f3ff]],
  Objects: [[0x1f4a1, 0x1f4ff], [0x1f5a5, 0x1f5ff], [0x1f9e0, 0x1f9ff]],
  Symbols: [[0x1f300, 0x1f321], [0x1f3f3, 0x1f3ff], [0x1f500, 0x1f5ff], [0x2600, 0x27bf]],
};

const CATEGORY_ICONS = {
  Smileys: Smile, People: UserRound, Animals: PawPrint, Food: Utensils, Travel: Plane,
  Activities: Trophy, Objects: Lightbulb, Symbols: Shapes, All: Grid2X2, Recent: Clock3,
};

function isEmojiPresentation(value) {
  try {
    return /\p{Emoji_Presentation}/u.test(value);
  } catch {
    return false;
  }
}

function buildEmojiSet(ranges) {
  const result = [];
  const seen = new Set();
  for (const [start, end] of ranges) {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      const emoji = String.fromCodePoint(codePoint);
      if (isEmojiPresentation(emoji) && !seen.has(emoji)) {
        seen.add(emoji);
        result.push(emoji);
      }
    }
  }
  return result;
}

function buildAllEmoji() {
  const result = [];
  for (let codePoint = 0x1f000; codePoint <= 0x1faff; codePoint += 1) {
    const emoji = String.fromCodePoint(codePoint);
    if (isEmojiPresentation(emoji)) result.push(emoji);
  }
  for (let codePoint = 0x2600; codePoint <= 0x27bf; codePoint += 1) {
    const emoji = String.fromCodePoint(codePoint);
    try {
      if (/\p{Emoji}/u.test(emoji)) result.push(`${emoji}\uFE0F`);
    } catch {}
  }
  return [...new Set(result)];
}

const CATEGORY_EMOJIS = Object.fromEntries(
  Object.entries(CATEGORY_RANGES).map(([name, ranges]) => [name, buildEmojiSet(ranges)]),
);
CATEGORY_EMOJIS.All = buildAllEmoji();
CATEGORY_EMOJIS.Recent = [];
const CATEGORY_NAMES = ['All', ...Object.keys(CATEGORY_RANGES), 'Recent'];
const ALL_EMOJIS = [...new Set(Object.values(CATEGORY_EMOJIS).flat())];

export default function EmojiPicker({ onPick, onClose, compact = false }) {
  const [category, setCategory] = useState('Smileys');
  const [query, setQuery] = useState('');
  const pickerRef = useRef(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emberly_recent_emojis') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    function handleEscape(event) { if (event.key === 'Escape') onClose?.(); }
    function handlePointerDown(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) onClose?.();
    }
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  const source = category === 'Recent' ? recent : CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.All;
  const filtered = useMemo(() => {
    const value = query.trim();
    if (!value) return source;
    return source.filter((emoji) => emoji.includes(value));
  }, [query, source]);

  const pick = (emoji) => {
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 24);
    setRecent(next);
    try { localStorage.setItem('emberly_recent_emojis', JSON.stringify(next)); } catch {}
    onPick?.(emoji);
  };

  return (
    <div ref={pickerRef} className={`absolute z-[90] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep shadow-[0_24px_70px_rgba(0,0,0,.35)] ${compact ? 'bottom-12 right-0' : 'bottom-0 right-0'}`} role="dialog" aria-label="Emoji picker">
      <div className="flex items-center gap-2 border-b border-emberly-ivory/10 p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-emberly-ivory/5 px-3 py-2 text-emberly-ivory/45">
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emoji" aria-label="Search emoji" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear emoji search"><X size={14} /></button>}
        </div>
        {onClose && <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emberly-ivory/45 hover:bg-emberly-ivory/5 hover:text-emberly-ivory" onClick={onClose} aria-label="Close emoji picker"><X size={16} /></button>}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-emberly-ivory/10 px-2 py-2" role="tablist" aria-label="Emoji categories">
        {CATEGORY_NAMES.map((name) => {
          const Icon = CATEGORY_ICONS[name] || Grid2X2;
          return <button key={name} type="button" role="tab" aria-selected={category === name} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${category === name ? 'bg-emberly-ivory text-emberly-navy' : 'text-emberly-ivory/45 hover:bg-emberly-ivory/5 hover:text-emberly-ivory'}`} onClick={() => setCategory(name)} title={name} aria-label={name}><Icon size={15} /></button>;
        })}
      </div>
      <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto p-3">
        {filtered.length ? filtered.map((emoji) => (
          <button type="button" key={emoji} className="grid aspect-square place-items-center rounded-lg text-xl transition hover:bg-emberly-ivory/10 active:scale-95" onClick={() => pick(emoji)} aria-label={`Insert ${emoji}`}>{emoji}</button>
        )) : <div className="col-span-full py-8 text-center text-sm text-emberly-ivory/40">No emoji found</div>}
      </div>
    </div>
  );
}

export { ALL_EMOJIS };
