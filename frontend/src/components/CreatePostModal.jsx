import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ImagePlus,
  Smile,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';
import api from '../api/axios';
import EmojiPicker from './EmojiPicker';
import MentionSuggestions from './MentionSuggestions';

const MAX_MEDIA = 10;
const MAX_CAPTION = 2200;

function getAvatar(user) {
  return user?.avatarUrl || user?.profilePicture || user?.profilePictureUrl || user?.imageUrl || '';
}

export default function CreatePostModal({ open, onClose, onCreated, currentUser }) {
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [captionCaret, setCaptionCaret] = useState(0);

  const captionRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);
  const mentionRef = useRef(null);
  const closeRef = useRef(null);


  const filePreviewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => () => filePreviewUrls.forEach((url) => URL.revokeObjectURL(url)), [filePreviewUrls]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (emojiOpen) setEmojiOpen(false);
        else onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, emojiOpen, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!emojiOpen) return undefined;
    const onPointerDown = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [emojiOpen]);

  useEffect(() => {
    if (open) return;
    setCaption('');
    setFiles([]);
    setPreviewIndex(0);
    setEmojiOpen(false);
    setCaptionCaret(0);
    setSubmitting(false);
    setError('');
  }, [open]);


  function handleFiles(event) {
    const incoming = Array.from(event.target.files || []);
    if (files.length >= MAX_MEDIA) {
      setError(`A post can contain up to ${MAX_MEDIA} media items.`);
      event.target.value = '';
      return;
    }
    const supported = incoming.filter((file) =>
      /^image\/(jpeg|png|gif|webp|avif)$/i.test(file.type) || /^video\/(mp4|webm|quicktime)$/i.test(file.type),
    );

    if (!supported.length) {
      setError('Choose a JPG, PNG, WEBP, GIF, AVIF, MP4, WebM, or MOV file.');
      event.target.value = '';
      return;
    }

    const remaining = MAX_MEDIA - files.length;
    const accepted = supported.slice(0, remaining);
    const tooLarge = accepted.find((file) => file.size > 100 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} is larger than the 100 MB limit.`);
      event.target.value = '';
      return;
    }

    setError('');
    setFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const unique = accepted.filter((file) => !keys.has(`${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...unique].slice(0, MAX_MEDIA);
    });
    if (supported.length > accepted.length) setError(`Only ${remaining} more media item${remaining === 1 ? '' : 's'} can be added.`);
    setPreviewIndex(0);
    event.target.value = '';
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviewIndex((current) => Math.max(0, Math.min(current, files.length - 2)));
  }

  function insertEmoji(emoji) {
    const textarea = captionRef.current;
    if (!textarea) {
      setCaption((value) => `${value}${emoji}`.slice(0, MAX_CAPTION));
      return;
    }
    const start = textarea.selectionStart ?? caption.length;
    const end = textarea.selectionEnd ?? caption.length;
    const next = `${caption.slice(0, start)}${emoji}${caption.slice(end)}`.slice(0, MAX_CAPTION);
    setCaption(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = Math.min(start + emoji.length, MAX_CAPTION);
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function submitPost(event) {
    event.preventDefault();
    if (submitting) return;
    if (!files.length) {
      setError('Add at least one photo or video.');
      return;
    }
    if (caption.trim().length > 2200) {
      setError('Caption must be 2200 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      formData.append('caption', caption.trim());
      const response = await api.post('/posts', formData);
      onCreated?.(response.data?.post || response.data?.data || response.data);
      onClose?.();
    } catch (requestError) {
      console.error('Post creation error:', requestError);
      setError(requestError.response?.data?.error || 'Could not publish your post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const previewFile = files[previewIndex];
  const previewUrl = filePreviewUrls[previewIndex];
  const previewIsVideo = Boolean(previewFile?.type?.startsWith('video/'));

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="create-post-title" className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-emberly-ivory/10 bg-emberly-navy-deep shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:rounded-[28px]" onSubmit={submitPost} onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-emberly-ivory/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-emberly-crimson-soft">New post</p>
            <h2 id="create-post-title">Share a moment</h2>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-emberly-ivory/50 transition hover:bg-emberly-ivory/5 hover:text-emberly-ivory" onClick={onClose} ref={closeRef} aria-label="Close create post">
            <X size={20} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-auto md:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <section className="min-w-0 border-b border-emberly-ivory/10 p-4 sm:p-5 md:border-b-0 md:border-r" aria-label="Post preview">
            <div className="relative mx-auto grid aspect-[4/5] w-full max-w-[560px] max-h-[68vh] place-items-center overflow-hidden rounded-2xl bg-emberly-navy">
              {previewUrl ? (
                <>
                  {previewIsVideo ? (
                    <video src={previewUrl} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                  ) : (
                    <img src={previewUrl} alt="Post preview" className="h-full w-full object-contain" />
                  )}
                  {files.length > 1 && (
                    <>
                      <button type="button" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-emberly-navy/75 text-emberly-ivory backdrop-blur transition hover:bg-emberly-navy" onClick={() => setPreviewIndex((value) => value === 0 ? files.length - 1 : value - 1)} aria-label="Previous media"><ChevronLeft size={19} /></button>
                      <button type="button" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-emberly-navy/75 text-emberly-ivory backdrop-blur transition hover:bg-emberly-navy" onClick={() => setPreviewIndex((value) => value === files.length - 1 ? 0 : value + 1)} aria-label="Next media"><ChevronRight size={19} /></button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-emberly-navy/80 px-2.5 py-1 text-[11px] font-bold text-emberly-ivory backdrop-blur">{previewIndex + 1} / {files.length}</div>
                    </>
                  )}
                </>
              ) : (
                <button type="button" className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-emberly-ivory/55 transition hover:bg-emberly-ivory/[.03]" onClick={() => fileInputRef.current?.click()}>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emberly-crimson/12 text-emberly-crimson-soft"><ImagePlus size={26} /></span>
                  <strong>Add photos or videos</strong>
                  <span>Choose up to {MAX_MEDIA} items</span>
                </button>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Selected media">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${index === previewIndex ? 'border-emberly-crimson' : 'border-transparent'}`}>
                    <button type="button" onClick={() => setPreviewIndex(index)} aria-label={`Preview ${index + 1}`}>
                      {file.type.startsWith('video/') ? <video src={filePreviewUrls[index]} muted playsInline /> : <img src={filePreviewUrls[index]} alt="" />}
                    </button>
                    <button type="button" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emberly-navy/85 text-emberly-ivory" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}><X size={12} /></button>
                  </div>
                ))}

              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-emberly-ivory/10 pb-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-emberly-blue text-sm font-black text-emberly-navy">
                {getAvatar(currentUser) ? <img src={getAvatar(currentUser)} alt="" /> : <span>{(currentUser?.username || 'Y').slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold text-emberly-ivory">@{currentUser?.username || currentUser?.fullName || 'you'}</strong>
                <span className="mt-0.5 block text-xs text-emberly-blue-soft">Public post</span>
              </div>
            </div>

            <div className="mt-5 flex min-h-[180px] flex-1 flex-col">
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(event) => { setCaption(event.target.value.slice(0, MAX_CAPTION)); setCaptionCaret(event.target.selectionStart ?? event.target.value.length); }}
                onClick={(event) => setCaptionCaret(event.currentTarget.selectionStart ?? 0)}
                onKeyUp={(event) => setCaptionCaret(event.currentTarget.selectionStart ?? 0)}
                onKeyDown={() => setCaptionCaret(captionRef.current?.selectionStart ?? caption.length)}
                placeholder="Write a caption…"
                maxLength={MAX_CAPTION}
                className="min-h-[150px] w-full flex-1 resize-none bg-transparent text-sm leading-6 text-emberly-ivory outline-none placeholder:text-emberly-ivory/30"
              />
              <div ref={mentionRef}>
                <MentionSuggestions
                  value={caption}
                  caret={captionCaret}
                  onSelect={(account, token) => {
                    const next = `${caption.slice(0, token.start)}@${account.username} ${caption.slice(token.end)}`.slice(0, MAX_CAPTION);
                    const cursor = Math.min(token.start + account.username.length + 2, MAX_CAPTION);
                    setCaption(next);
                    setCaptionCaret(cursor);
                    requestAnimationFrame(() => { captionRef.current?.focus(); captionRef.current?.setSelectionRange(cursor, cursor); });
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-emberly-ivory/35" ref={emojiRef}>
                <button type="button" className={`grid h-9 w-9 place-items-center rounded-xl text-emberly-ivory/45 transition hover:bg-emberly-ivory/5 hover:text-emberly-ivory ${emojiOpen ? 'bg-emberly-ivory/10 text-emberly-ivory' : ''}`} onClick={() => setEmojiOpen((value) => !value)} aria-expanded={emojiOpen} aria-label="Add emoji"><Smile size={19} /></button>
                <span>{caption.length}/{MAX_CAPTION}</span>

                {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
              </div>
            </div>

            {error && <div className="mt-4 rounded-xl border border-emberly-crimson/25 bg-emberly-crimson/10 px-3 py-2.5 text-xs leading-5 text-emberly-crimson-soft" role="alert">{error}</div>}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-emberly-ivory/10 pt-4">
              <input ref={fileInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime" multiple onChange={handleFiles} />
              <span className="text-xs text-emberly-ivory/35">Your post will appear on your profile and in followers’ feeds.</span>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emberly-crimson px-4 text-sm font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || files.length === 0}>
                {submitting ? <><Loader2 size={17} className="animate-spin" /> Publishing…</> : <><Check size={17} /> Share</>}
              </button>
            </div>
          </section>
        </div>
      </form>

    </div>
  );
}

function PlusIcon() {
  return <span className="h-5 w-5">+</span>;
}
