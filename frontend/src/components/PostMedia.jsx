import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import MediaViewer from './MediaViewer';

export default function PostMedia({ media, alt, maxHeight, onDoubleTap }) {
  const items = Array.isArray(media) ? media : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const lastTap = useRef(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => setActiveIndex(0), [media]);
  const aspectRatio = useMemo(() => {
    const first = items[0];
    const ratio = Number(first?.width) / Number(first?.height);
    return Number.isFinite(ratio) && ratio > 0 ? Math.min(Math.max(ratio, 4 / 5), 1.91) : 4 / 5;
  }, [items]);

  if (!items.length) return null;
  const previous = () => setActiveIndex((i) => (i === 0 ? items.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === items.length - 1 ? 0 : i + 1));

  const tap = (index) => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      onDoubleTap?.();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setViewerOpen(true);
    setActiveIndex(index);
  };

  return (
    <div className="relative w-full overflow-hidden bg-emberly-navy-deep" style={{ aspectRatio, maxHeight: maxHeight || undefined }}>
      {items.map((item, index) => {
        const url = typeof item === 'string' ? item : item?.url || item?.mediaUrl || item?.imageUrl;
        if (!url) return null;
        const isVideo = item?.resource_type === 'video' || item?.resourceType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url);
        const className = `absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'}`;
        return isVideo ? (
          <video key={`${url}-${index}`} src={url} controls playsInline preload={index === 0 ? 'metadata' : 'none'} className={className} onDoubleClick={onDoubleTap} />
        ) : (
          <img key={`${url}-${index}`} src={url} alt={alt || `Post image ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={index === 0 ? 'high' : 'auto'} className={className} onClick={() => tap(index)} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        );
      })}

      {items.length > 1 && (
        <>
          <button type="button" onClick={previous} aria-label="Previous media" className="absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline-white">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={next} aria-label="Next media" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline-white">
            <ChevronRight size={18} />
          </button>
          <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {activeIndex + 1}/{items.length}
          </div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1.5 backdrop-blur-sm" aria-label="Media pagination">
            {items.map((_, index) => (
              <button key={index} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show media ${index + 1}`} className={`h-1.5 rounded-full transition-all ${activeIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/55'}`} />
            ))}
          </div>
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent" />
      {viewerOpen && <MediaViewer media={items} initialIndex={activeIndex} alt={alt} onClose={() => setViewerOpen(false)} />}
      {items.every((item) => !(typeof item === 'string' ? item : item?.url || item?.mediaUrl || item?.imageUrl)) && (
        <div className="absolute inset-0 grid place-items-center text-emberly-ivory/60"><ImageOff size={28} /></div>
      )}
    </div>
  );
}
