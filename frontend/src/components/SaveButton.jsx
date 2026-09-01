import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function SaveButton({ postId, initialSaved, className = '' }) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState(Boolean(initialSaved));
  const [busy, setBusy] = useState(false);
  useEffect(() => setSaved(Boolean(initialSaved)), [initialSaved]);
  const toggle = async () => {
    if (busy) return;
    const next = !saved;
    setSaved(next); setBusy(true);
    try {
      const res = await api.post(`/posts/${postId}/save`);
      setSaved(Boolean(res.data.saved));
      showToast(res.data.saved ? 'Saved to your collection' : 'Removed from saved');
    } catch { setSaved(!next); showToast('Could not update saved posts', { tone: 'error' }); }
    finally { setBusy(false); }
  };
  return <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save post'} className={`grid h-10 w-10 place-items-center rounded-full text-emberly-ivory transition hover:bg-emberly-ivory/10 hover:text-emberly-blue-soft active:scale-90 disabled:opacity-50 ${className}`}><Bookmark size={22} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} /></button>;
}
