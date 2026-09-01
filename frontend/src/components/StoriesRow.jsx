import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const avatar = (user) => user?.avatarUrl || user?.profilePicture || user?.imageUrl || '';
function Avatar({ user, size = 'h-14 w-14' }) {
  const src = avatar(user);
  return src ? <img src={src} alt="" loading="lazy" decoding="async" className={`${size} rounded-full object-cover`} /> : <span className={`${size} grid place-items-center rounded-full bg-emberly-crimson font-bold text-emberly-ivory`}>{(user?.username || 'U')[0].toUpperCase()}</span>;
}

function StoryViewer({ group, startIndex, onClose, onDeleted }) {
  const { user: currentUser } = useAuth();
  const [index, setIndex] = useState(startIndex);
  const story = group.stories[index];
  useEffect(() => { if (story) api.post(`/stories/${story.id}/view`).catch(() => {}); }, [story?.id]);
  useEffect(() => {
    if (!story || story.resourceType === 'video') return undefined;
    const timer = setTimeout(() => index < group.stories.length - 1 ? setIndex((v) => v + 1) : onClose(), 5000);
    return () => clearTimeout(timer);
  }, [story?.id, index, group.stories.length, onClose]);
  if (!story) return null;
  const remove = async () => { try { await api.delete(`/stories/${story.id}`); onDeleted?.(story.id); group.stories.length <= 1 ? onClose() : setIndex((v) => Math.max(0, v - 1)); } catch {} };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/85 p-0 backdrop-blur-md sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="relative flex h-full w-full flex-col overflow-hidden bg-emberly-navy-deep sm:h-[min(760px,92vh)] sm:max-w-[430px] sm:rounded-3xl sm:border sm:border-emberly-ivory/10 sm:shadow-2xl">
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1">{group.stories.map((s, i) => <span key={s.id} className={`h-0.5 flex-1 rounded-full ${i <= index ? 'bg-emberly-ivory' : 'bg-emberly-ivory/25'}`} />)}</div>
      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pb-4 pt-6 text-white"><Avatar user={story.author} size="h-8 w-8" /><div className="min-w-0"><p className="truncate text-xs font-bold">@{story.author.username}</p><p className="text-[10px] text-white/50">24-hour story</p></div><div className="ml-auto flex gap-1">{currentUser?.id === story.author.id && <button type="button" onClick={remove} className="grid h-8 w-8 place-items-center rounded-full bg-black/35" aria-label="Delete story"><Trash2 size={15} /></button>}<button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/35" aria-label="Close story"><X size={17} /></button></div></header>
      <div className="relative min-h-0 flex-1" onClick={(e) => { if (e.target !== e.currentTarget) return; e.clientX < window.innerWidth / 2 ? setIndex((v) => Math.max(0, v - 1)) : index < group.stories.length - 1 ? setIndex((v) => v + 1) : onClose(); }}>
        {story.resourceType === 'video' ? <video src={story.mediaUrl} autoPlay playsInline controls className="h-full w-full object-contain" /> : story.resourceType === 'image' ? <img src={story.mediaUrl} alt="" decoding="async" fetchPriority="high" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center bg-emberly-crimson p-10 text-center"><p className="font-display text-3xl font-semibold leading-tight text-emberly-ivory">{story.caption}</p></div>}
        {story.caption && story.resourceType !== 'text' && <p className="absolute inset-x-5 bottom-6 rounded-xl bg-black/35 p-3 text-sm leading-5 text-white backdrop-blur-sm">{story.caption}</p>}
        {group.stories.length > 1 && <><button type="button" onClick={() => setIndex((v) => Math.max(0, v - 1))} className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white sm:grid" aria-label="Previous story"><ChevronLeft size={18} /></button><button type="button" onClick={() => index < group.stories.length - 1 ? setIndex((v) => v + 1) : onClose()} className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white sm:grid" aria-label="Next story"><ChevronRight size={18} /></button></>}
      </div>
    </section>
  </div>;
}

export default function StoriesRow() {
  const [groups, setGroups] = useState([]); const [loading, setLoading] = useState(true); const [viewer, setViewer] = useState(null); const [composerOpen, setComposerOpen] = useState(false); const [caption, setCaption] = useState(''); const [textMode, setTextMode] = useState(false); const [file, setFile] = useState(null); const [error, setError] = useState(''); const inputRef = useRef(null);
  const storyPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl); }, [storyPreviewUrl]);
  const load = () => { setLoading(true); api.get('/stories/feed').then((r) => setGroups(r.data.stories || [])).catch(() => setGroups([])).finally(() => setLoading(false)); };
  useEffect(load, []);
  const publish = async (e) => { e.preventDefault(); if (!file && !caption.trim()) return; const form = new FormData(); if (file) form.append('media', file); form.append('caption', caption); try { await api.post('/stories', form); setComposerOpen(false); setFile(null); setCaption(''); setTextMode(false); load(); } catch (err) { setError(err.response?.data?.error || 'Could not publish story.'); } };
  return <>
    <section aria-label="Stories" className="flex w-full gap-4 overflow-x-auto px-4 pb-1 pt-1 sm:px-0">
      <button type="button" onClick={() => setComposerOpen(true)} className="group flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center"><span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-emberly-blue/60 bg-emberly-navy-soft/60 transition group-hover:border-emberly-crimson"><Plus size={19} className="text-emberly-ivory" /></span><span className="w-full truncate text-[10px] font-semibold text-emberly-ivory/70">Your story</span></button>
      {loading ? [1,2,3,4].map((i) => <span key={i} className="h-[66px] w-[66px] shrink-0 animate-pulse rounded-xl bg-emberly-ivory/5" />) : groups.map((group) => <button key={group.user.id} type="button" onClick={() => setViewer({ group, index: 0 })} className="group flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center"><span className={`rounded-full p-[2px] ${group.hasUnviewed ? 'bg-emberly-crimson' : 'bg-emberly-ivory/20'}`}><span className="block rounded-full bg-emberly-navy p-[2px]"><Avatar user={group.user} /></span></span><span className="w-full truncate text-[10px] font-semibold text-emberly-ivory/70 group-hover:text-emberly-ivory">@{group.user.username}</span></button>)}
    </section>
    {composerOpen && <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setComposerOpen(false)}><form onSubmit={publish} className="w-full rounded-t-3xl border border-emberly-ivory/10 bg-emberly-navy p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emberly-blue">Share</p><h2 className="mt-1 font-display text-xl font-semibold">A moment, for 24 hours.</h2></div><button type="button" onClick={() => setComposerOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-emberly-ivory/10" aria-label="Close"><X size={17} /></button></div><div className="mb-4 grid grid-cols-2 rounded-xl border border-emberly-ivory/10 p-1"><button type="button" onClick={() => setTextMode(false)} className={`rounded-lg py-2 text-xs font-bold ${!textMode ? 'bg-emberly-ivory text-emberly-navy' : 'text-emberly-ivory/50'}`}>Photo / video</button><button type="button" onClick={() => { setTextMode(true); setFile(null); }} className={`rounded-lg py-2 text-xs font-bold ${textMode ? 'bg-emberly-ivory text-emberly-navy' : 'text-emberly-ivory/50'}`}>Text</button></div>{!textMode ? <><button type="button" onClick={() => inputRef.current?.click()} className="mb-4 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-emberly-ivory/15 bg-emberly-navy-deep text-sm text-emberly-ivory/55">{file ? <img src={storyPreviewUrl} alt="Selected story media" decoding="async" className="h-full w-full object-cover" /> : <span><Plus className="mx-auto mb-2" size={24} /><b className="block text-emberly-ivory">Add media</b><small>It disappears after 24 hours.</small></span>}</button><input ref={inputRef} hidden type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></> : <div className="mb-4 grid aspect-[4/3] place-items-center rounded-2xl bg-emberly-crimson p-8 text-center"><p className="font-display text-2xl font-semibold">{caption || 'Write your status below.'}</p></div>}<input value={caption} maxLength={280} onChange={(e) => setCaption(e.target.value)} placeholder={textMode ? 'What’s on your mind?' : 'Add a short note…'} className="mb-3 h-11 w-full rounded-xl border border-emberly-ivory/15 bg-emberly-navy-deep px-3 text-sm text-emberly-ivory placeholder:text-emberly-ivory/35 focus:border-emberly-blue focus:outline-none" />{error && <p className="mb-3 text-xs text-emberly-crimson-soft">{error}</p>}<button disabled={!file && !caption.trim()} className="w-full rounded-xl bg-emberly-crimson py-3 text-sm font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark disabled:cursor-not-allowed disabled:opacity-40">Share story</button></form></div>}
    {viewer && <StoryViewer group={viewer.group} startIndex={viewer.index} onClose={() => setViewer(null)} onDeleted={(id) => setGroups((prev) => prev.map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== id) })).filter((g) => g.stories.length))} />}
  </>;
}
