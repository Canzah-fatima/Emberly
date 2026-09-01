import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2, MessageCircle, Search, Send, Smile, X } from 'lucide-react';
import api from '../api/axios';
import { createRealtimeConnection } from '../api/realtime';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EmojiPicker from '../components/EmojiPicker';


function timeLabel(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatPreview(message) {
  if (!message) return 'Start a conversation';
  if (message.body) return message.body;
  return 'Shared a post';
}

export default function Messages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesBefore, setMessagesBefore] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [mobileList, setMobileList] = useState(true);
  const [sharePostId, setSharePostId] = useState(params.get('sharePost') || '');
  const [attachment, setAttachment] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [typingUserId, setTypingUserId] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const threadRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingStopRef = useRef(null);
  const typingStateRef = useRef(false);

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentPreview({ url, type: attachment.type });
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const loadConversations = useCallback(async (selectFirst = true) => {
    try {
      const res = await api.get('/messages');
      const next = res.data.conversations || [];
      setConversations(next);
      if (selectFirst && !activeId && next[0]) {
        setActiveId(next[0].id);
        setMobileList(false);
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not load messages', { tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeId, showToast]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const to = params.get('to');
    if (!to) return;
    api.post('/messages', { username: to })
      .then((res) => {
        const c = res.data.conversation;
        setConversations((prev) => [c, ...prev.filter((item) => item.id !== c.id)]);
        setActiveId(c.id);
        setMobileList(false);
        setParams({}, { replace: true });
      })
      .catch((error) => showToast(error.response?.data?.error || 'Could not open conversation', { tone: 'error' }));
  }, [params, setParams, showToast]);

  const loadMessages = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) return;
    if (!silent) setMessagesLoading(true);
    try {
      const res = await api.get(`/messages/${conversationId}/messages`);
      setMessages(res.data.messages || []);
      setMessagesHasMore(Boolean(res.data.hasMore));
      setMessagesBefore(res.data.nextBefore || null);
      await api.post(`/messages/${conversationId}/read`).catch(() => {});
      setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
    } catch (error) {
      if (!silent) showToast(error.response?.data?.error || 'Could not load conversation', { tone: 'error' });
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!activeId) return undefined;
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);
    loadMessages(activeId);
    const stop = createRealtimeConnection({
      onSocket: (socket) => { window.__emberlyRealtimeSocket = socket; },
      onStatus: setRealtimeStatus,
      onMessage: ({ conversationId, message }) => {
        setConversations((prev) => {
          const next = prev.map((conversation) => conversation.id === conversationId
            ? { ...conversation, lastMessage: message, updatedAt: message.createdAt, unreadCount: conversationId === activeId ? 0 : (conversation.unreadCount || 0) + (message.sender?.id === user?.id ? 0 : 1) }
            : conversation);
          return next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });
        if (conversationId === activeId) {
          setMessages((prev) => prev.some((item) => item.id === message.id) ? prev : [...prev, message]);
          if (message.sender?.id !== user?.id && !document.hidden) {
            api.post(`/messages/${conversationId}/read`).catch(() => {});
          }
        }
        window.dispatchEvent(new CustomEvent('emberly:messages-changed', {
          detail: { conversationId, messageId: message.id },
        }));
      },
      onRead: ({ conversationId, readAt }) => {
        if (conversationId === activeId) setMessages((prev) => prev.map((message) => message.sender?.id === user?.id ? { ...message, readAt } : message));
        window.dispatchEvent(new CustomEvent('emberly:messages-changed', {
          detail: { conversationId, readAt },
        }));
      },
      onTyping: ({ conversationId, userId, isTyping }) => {
        if (conversationId !== activeId || userId === user?.id) return;
        setTypingUserId(isTyping ? userId : null);
        window.clearTimeout(typingTimerRef.current);
        if (isTyping) typingTimerRef.current = window.setTimeout(() => setTypingUserId(null), 2500);
      },
    });
    const handleVisibility = () => {
      if (!document.hidden) loadMessages(activeId, true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      if (window.__emberlyRealtimeSocket) window.__emberlyRealtimeSocket = null;
      window.clearTimeout(typingTimerRef.current);
      window.clearTimeout(typingStopRef.current);
      typingStateRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeId, loadMessages, user?.id]);

  async function loadOlderMessages() {
    if (!activeId || !messages.length || !messagesHasMore || !messagesBefore || loadingOlder) return;
    // Loading history should never yank the user back to the newest message.
    stickToBottomRef.current = false;
    setShowScrollToBottom(false);
    setLoadingOlder(true);
    const previousHeight = document.querySelector('.message-thread__body')?.scrollHeight || 0;
    try {
      const res = await api.get(`/messages/${activeId}/messages`, { params: { before: messagesBefore, limit: 40 } });
      const older = res.data.messages || [];
      setMessages((prev) => [...older, ...prev.filter((item) => !older.some((m) => m.id === item.id))]);
      setMessagesHasMore(Boolean(res.data.hasMore));
      setMessagesBefore(res.data.nextBefore || null);
      requestAnimationFrame(() => {
        const bodyEl = document.querySelector('.message-thread__body');
        if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight - previousHeight;
      });
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not load older messages', { tone: 'error' });
    } finally { setLoadingOlder(false); }
  }

  useEffect(() => {
    if (!messages.length || !stickToBottomRef.current) return;
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [messages.length]);

  const handleThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    stickToBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom && messages.length > 0);
  };

  const scrollToBottom = () => {
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    const q = search.trim();
    if (!showPeople || !q) { setPeople([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPeopleLoading(true);
      try {
        const res = await api.get('/users/search', { params: { q } });
        if (!cancelled) setPeople(res.data.users || []);
      } catch { if (!cancelled) setPeople([]); }
      finally { if (!cancelled) setPeopleLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, showPeople]);

  const signalTyping = (value) => {
    if (!activeId) return;
    const socket = window.__emberlyRealtimeSocket;
    const isTyping = value.trim().length > 0;
    if (socket?.readyState === WebSocket.OPEN && typingStateRef.current !== isTyping) {
      socket.send(JSON.stringify({ type: 'typing', conversationId: activeId, isTyping }));
      typingStateRef.current = isTyping;
    }
    window.clearTimeout(typingStopRef.current);
    if (isTyping) {
      typingStopRef.current = window.setTimeout(() => {
        const current = window.__emberlyRealtimeSocket;
        if (current?.readyState === WebSocket.OPEN && typingStateRef.current) {
          current.send(JSON.stringify({ type: 'typing', conversationId: activeId, isTyping: false }));
          typingStateRef.current = false;
        }
      }, 1800);
    }
  };

  async function openPerson(person) {
    try {
      const res = await api.post('/messages', { userId: person.id });
      const c = res.data.conversation;
      setConversations((prev) => [c, ...prev.filter((item) => item.id !== c.id)]);
      setActiveId(c.id);
      setMobileList(false);
      setSearch('');
      setShowPeople(false);
      inputRef.current?.focus();
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not start chat', { tone: 'error' });
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const text = body.trim();
    if (attachment && attachment.size > 50 * 1024 * 1024) {
      showToast('Message media must be 50 MB or smaller.', { tone: 'error' });
      return;
    }
    if ((!text && !sharePostId && !attachment) || !activeId || sending) return;
    setSending(true);
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);
    try {
      const form = new FormData();
      form.append('body', text);
      if (sharePostId) form.append('sharedPostId', sharePostId);
      if (attachment) form.append('media', attachment);
      const res = await api.post(`/messages/${activeId}/messages`, form);
      setMessages((prev) => prev.some((item) => item.id === res.data.message.id) ? prev : [...prev, res.data.message]);
      setBody('');
      setSharePostId('');
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = '';
      setEmojiOpen(false);
      params.delete('sharePost');
      setParams(params, { replace: true });
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, lastMessage: res.data.message, updatedAt: res.data.message.createdAt } : c));
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      showToast(error.response?.data?.error || 'Message could not be sent', { tone: 'error' });
    } finally { setSending(false); }
  }

  return (
    <div className="mx-auto mt-4 mb-4 h-[calc(100dvh-6.75rem)] w-full max-w-6xl pb-0 sm:px-4 lg:my-6 lg:h-[calc(100dvh-3rem)] lg:p-4">
      <div className="grid h-full overflow-hidden border-y border-emberly-ivory/10 bg-emberly-navy-deep sm:rounded-3xl sm:border lg:grid-cols-[330px_1fr]">
        <aside className={`${!mobileList ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col border-r border-emberly-ivory/10 bg-emberly-navy-deep`}>
          <header className="flex items-center justify-between px-4 py-4 sm:px-5 sm:py-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-emberly-crimson-soft">Private</p><h1 className="mt-1 font-display text-2xl font-semibold">Messages</h1></div>
            <button type="button" onClick={() => { setShowPeople(true); setTimeout(() => document.getElementById('message-person-search')?.focus(), 0); }} className="grid h-10 w-10 place-items-center rounded-xl bg-emberly-crimson text-emberly-ivory transition hover:bg-emberly-crimson-dark" aria-label="New message"><MessageCircle size={18}/></button>
          </header>
          <div className="relative mx-4 mb-3 flex items-center gap-2 rounded-xl border border-emberly-ivory/10 bg-emberly-navy/70 px-3 text-emberly-ivory/45 focus-within:border-emberly-blue"><Search size={16}/><input id="message-person-search" value={search} onChange={e=>{setSearch(e.target.value);setShowPeople(true)}} onFocus={()=>setShowPeople(true)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-emberly-ivory outline-none placeholder:text-emberly-ivory/35"/>{search&&<button type="button" onClick={()=>{setSearch('');setShowPeople(false)}}><X size={15}/></button>}</div>
          {showPeople&&search.trim()&&<div className="mx-4 mb-2 overflow-hidden rounded-xl border border-emberly-ivory/10 bg-emberly-navy-soft">{peopleLoading?<div className="grid place-items-center p-4"><Loader2 className="animate-spin" size={18}/></div>:people.length?people.map(person=><button type="button" key={person.id} onClick={()=>openPerson(person)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-emberly-ivory/5"><Avatar user={person} size={40}/><span className="min-w-0"><b className="block text-sm">@{person.username}</b><small className="block truncate text-emberly-ivory/45">{person.fullName}</small></span></button>):<div className="p-4 text-sm text-emberly-ivory/45">No people found</div>}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{loading?<div className="grid h-full place-items-center"><Loader2 className="animate-spin text-emberly-blue" size={22}/></div>:conversations.length?conversations.map(c=><button type="button" key={c.id} onClick={()=>{setActiveId(c.id);setMobileList(false);setShowPeople(false)}} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${c.id===activeId?'bg-emberly-ivory text-emberly-ink':'hover:bg-emberly-ivory/5'}`}><Avatar user={c.user} size={48}/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="truncate text-sm">{c.user?.fullName||`@${c.user?.username}`}</b><span className={`text-[10px] ${c.id===activeId?'text-emberly-ink/45':'text-emberly-ivory/35'}`}>{timeLabel(c.updatedAt)}</span></div><p className={`mt-1 truncate text-xs ${c.id===activeId?'text-emberly-ink/55':'text-emberly-ivory/45'}`}>{formatPreview(c.lastMessage)}</p></div>{c.unreadCount>0&&<span className="grid h-5 min-w-5 place-items-center rounded-full bg-emberly-crimson px-1 text-[10px] font-bold text-emberly-ivory">{c.unreadCount>9?'9+':c.unreadCount}</span>}</button>):<div className="flex h-full flex-col items-center justify-center px-6 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emberly-crimson/10 text-emberly-crimson-soft"><MessageCircle size={22}/></div><strong className="mt-4">Your messages</strong><span className="mt-1 text-xs leading-5 text-emberly-ivory/45">Start a private conversation with someone on Emberly.</span><button type="button" onClick={()=>setShowPeople(true)} className="mt-4 rounded-full bg-emberly-crimson px-4 py-2 text-xs font-semibold">Message someone</button></div>}</div>
        </aside>
        <section className={`${mobileList?'hidden lg:flex':'flex'} min-w-0 flex-col bg-emberly-navy`}>
          {activeConversation?<><header className="flex items-center gap-3 border-b border-emberly-ivory/10 bg-emberly-navy-deep/80 px-4 py-3 backdrop-blur"><button type="button" onClick={()=>setMobileList(true)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-emberly-ivory/5 lg:hidden"><ArrowLeft size={19}/></button><Avatar user={activeConversation.user} size={42}/><div className="min-w-0 flex-1"><b className="block truncate text-sm">{activeConversation.user?.fullName||`@${activeConversation.user?.username}`}</b><span className="text-xs text-emberly-ivory/45">{typingUserId?'Typing…':`@${activeConversation.user?.username}`}</span></div><span className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emberly-ivory/40 sm:flex"><i className="h-1.5 w-1.5 rounded-full bg-emberly-blue"/>{realtimeStatus==='connected'?'Live':realtimeStatus==='reconnecting'?'Reconnecting':'Connecting'}</span></header>
            <div ref={threadRef} onScroll={handleThreadScroll} className="message-thread__body relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8"><div className="mx-auto flex max-w-2xl flex-col gap-2">{showScrollToBottom&&<button type="button" onClick={scrollToBottom} className="sticky bottom-3 z-10 mx-auto rounded-full border border-emberly-ivory/10 bg-emberly-navy-deep/95 px-3.5 py-2 text-xs font-semibold text-emberly-ivory shadow-lg backdrop-blur hover:border-emberly-blue/40">Jump to latest</button>}{!messagesLoading&&messagesHasMore&&<button type="button" onClick={loadOlderMessages} disabled={loadingOlder} className="mx-auto mb-3 rounded-full border border-emberly-ivory/10 px-4 py-2 text-xs text-emberly-ivory/55">{loadingOlder?'Loading…':'Load older messages'}</button>}{messagesLoading?<div className="grid h-full place-items-center py-20"><Loader2 className="animate-spin text-emberly-blue" size={22}/></div>:messages.length?messages.map(message=>{const mine=message.sender?.id===user?.id;return <div className={`flex items-end gap-2 ${mine?'justify-end':'justify-start'}`} key={message.id}>{!mine&&<Avatar user={message.sender} size={28}/>}<div className={`max-w-[78%] sm:max-w-[65%] ${mine?'items-end':'items-start'} flex flex-col gap-1`}>{message.media&&<div className="max-w-full overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-black/20">{message.media.resourceType==='video'?<video src={message.media.url} controls playsInline preload="metadata" className="max-h-72 max-w-full object-contain"/>:<img src={message.media.url} alt="Message attachment" loading="lazy" className="max-h-72 max-w-full object-contain"/>}</div>}{message.sharedPost&&<div className="overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-deep">{message.sharedPost.resourceType==='video'?<video src={message.sharedPost.imageUrl} controls playsInline preload="metadata" className="max-h-60 w-full object-contain"/>:<img src={message.sharedPost.imageUrl} alt="Shared post" loading="lazy" className="max-h-60 w-full object-cover"/>}<div className="px-3 py-2"><b className="text-xs">@{message.sharedPost.author?.username}</b><p className="truncate text-xs text-emberly-ivory/45">{message.sharedPost.caption||'Shared a post with you'}</p></div></div>}{message.body&&<div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${mine?'rounded-br-md bg-emberly-crimson text-emberly-ivory':'rounded-bl-md bg-emberly-navy-soft text-emberly-ivory'}`}>{message.body}</div>}<small className="px-1 text-[10px] text-emberly-ivory/30">{timeLabel(message.createdAt)}{mine&&message.readAt?' · Seen':''}</small></div></div>;}):<div className="flex h-full flex-col items-center justify-center py-20 text-center"><Avatar user={activeConversation.user} size={74}/><h2 className="mt-4 font-display text-2xl">{activeConversation.user?.fullName||`@${activeConversation.user?.username}`}</h2><p className="mt-1 text-sm text-emberly-ivory/45">@{activeConversation.user?.username} · Emberly</p><span className="mt-5 rounded-full bg-emberly-ivory/5 px-4 py-2 text-xs text-emberly-ivory/50">Say hello</span></div>}<div ref={bottomRef}/></div></div>
            <form className="border-t border-emberly-ivory/10 bg-emberly-navy-deep/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-4" onSubmit={sendMessage}><div className="mx-auto max-w-2xl">{(sharePostId||attachment)&&<div className="mb-2 overflow-hidden rounded-2xl border border-emberly-ivory/10 bg-emberly-ivory/[0.035]">{attachmentPreview&&<div className="relative max-h-44 overflow-hidden bg-black/20">{attachmentPreview.type.startsWith('video/')?<video src={attachmentPreview.url} className="mx-auto max-h-44 w-full object-contain" muted playsInline/>:<img src={attachmentPreview.url} alt="Attachment preview" className="mx-auto max-h-44 w-full object-contain"/>}<button type="button" onClick={()=>{setAttachment(null);if(fileRef.current)fileRef.current.value=''}} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur" aria-label="Remove attachment"><X size={14}/></button></div>}<div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-emberly-ivory/55"><span className="min-w-0 truncate">{sharePostId?'Post ready to share':attachment?.name}</span>{!attachmentPreview&&<button type="button" onClick={()=>{setSharePostId('');setAttachment(null);if(fileRef.current)fileRef.current.value=''}} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg hover:bg-emberly-ivory/5" aria-label="Remove attachment"><X size={14}/></button>}</div></div>}<div className="flex items-center gap-2 rounded-2xl border border-emberly-ivory/10 bg-emberly-navy px-2 py-2 focus-within:border-emberly-blue"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={e=>setAttachment(e.target.files?.[0]||null)}/><button type="button" onClick={()=>fileRef.current?.click()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-emberly-ivory/45 hover:bg-emberly-ivory/5 hover:text-emberly-ivory" aria-label="Add photo or video"><ImageIcon size={19}/></button><input ref={inputRef} value={body} onChange={e=>{const next=e.target.value.slice(0,2000);setBody(next);signalTyping(next)}} placeholder="Message..." maxLength={2000} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-emberly-ivory/30"/><div className="relative"><button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-emberly-ivory/45 hover:bg-emberly-ivory/5 hover:text-emberly-ivory" aria-label="Add emoji" onMouseDown={e=>e.stopPropagation()} onClick={()=>setEmojiOpen(v=>!v)}><Smile size={19}/></button>{emojiOpen&&<EmojiPicker onPick={emoji=>{setBody(v=>`${v}${emoji}`.slice(0,2000));inputRef.current?.focus()}} onClose={()=>setEmojiOpen(false)} compact/>}</div><button type="submit" disabled={sending||(!body.trim()&&!sharePostId&&!attachment)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emberly-crimson text-emberly-ivory transition hover:bg-emberly-crimson-dark disabled:opacity-30" aria-label="Send message">{sending?<Loader2 size={17} className="animate-spin"/>:<Send size={17}/>}</button></div></div></form>
          </>:<div className="flex h-full flex-col items-center justify-center text-center"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-emberly-crimson/10 text-emberly-crimson-soft"><MessageCircle size={28}/></div><h2 className="mt-5 font-display text-2xl">Your messages</h2><p className="mt-1 text-sm text-emberly-ivory/45">Choose a conversation to start chatting.</p></div>}
        </section>
      </div>
    </div>
  );
}
