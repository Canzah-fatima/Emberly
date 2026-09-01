import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';

function mediaUrl(item) {
  return typeof item === 'string' ? item : item?.url || item?.mediaUrl || item?.imageUrl || '';
}

function isVideo(item, url) {
  return item?.resource_type === 'video' || item?.resourceType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export default function MediaViewer({ media = [], initialIndex = 0, alt = 'Post media', onClose }) {
  const items = Array.isArray(media) ? media.filter((item) => mediaUrl(item)) : [];
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
  const touchStart = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft' && items.length > 1) setIndex((value) => (value - 1 + items.length) % items.length);
      if (event.key === 'ArrowRight' && items.length > 1) setIndex((value) => (value + 1) % items.length);
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [items.length, onClose]);

  if (!items.length) return null;

  const current = items[index];
  const url = mediaUrl(current);
  const video = isVideo(current, url);
  const previous = () => setIndex((value) => (value - 1 + items.length) % items.length);
  const next = () => setIndex((value) => (value + 1) % items.length);

  const onTouchStart = (event) => { touchStart.current = event.changedTouches[0].clientX; };
  const onTouchEnd = (event) => {
    if (touchStart.current == null || items.length < 2) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 45) return;
    if (delta > 0) previous(); else next();
  };

  const downloadCurrent = () => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = `emberly-${index + 1}`;
    anchor.click();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex min-h-[100dvh] items-center justify-center bg-[#061c2a]/95 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Media viewer, item ${index + 1} of ${items.length}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-1 py-1 sm:px-0 sm:py-0">
          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur-sm">
            {index + 1} / {items.length}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadCurrent} aria-label="Open media in new tab" title="Open media" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-sm transition hover:bg-white/10 hover:text-white">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} ref={closeRef} aria-label="Close media viewer" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-sm transition hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center px-1 py-14 sm:px-12 sm:py-12">
          {video ? (
            <video key={url} src={url} controls autoPlay playsInline className="max-h-[min(78dvh,760px)] max-w-full rounded-xl object-contain shadow-2xl" />
          ) : (
            <img key={url} src={url} alt={alt || `Post image ${index + 1}`} decoding="async" fetchPriority="high" className="max-h-[min(82dvh,820px)] max-w-full rounded-xl object-contain shadow-2xl" draggable="false" />
          )}
        </div>

        {items.length > 1 && (
          <>
            <button type="button" onClick={previous} aria-label="Previous media" className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-xl backdrop-blur-sm transition hover:bg-black/65 sm:left-2 sm:h-12 sm:w-12">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={next} aria-label="Next media" className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-xl backdrop-blur-sm transition hover:bg-black/65 sm:right-2 sm:h-12 sm:w-12">
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-1 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/40 p-1.5 backdrop-blur-sm sm:bottom-0">
              {items.map((item, itemIndex) => {
                const thumbUrl = mediaUrl(item);
                return (
                  <button
                    key={`${thumbUrl}-${itemIndex}`}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`Show media ${itemIndex + 1}`}
                    aria-current={index === itemIndex ? 'true' : undefined}
                    className={`h-9 w-9 shrink-0 overflow-hidden rounded-md border transition sm:h-10 sm:w-10 ${index === itemIndex ? 'border-emberly-ivory ring-1 ring-emberly-ivory/40' : 'border-transparent opacity-55 hover:opacity-90'}`}
                  >
                    {isVideo(item, thumbUrl) ? <video src={thumbUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={thumbUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
