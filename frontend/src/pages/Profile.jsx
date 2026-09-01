import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Camera, Grid3X3, Link2, Loader2, Lock, MoreHorizontal, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';

function ProfileSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10" aria-busy="true">
      <div className="animate-pulse space-y-6">
        <div className="h-28 rounded-3xl bg-emberly-navy-soft" />
        <div className="grid grid-cols-[88px_1fr] gap-5 sm:grid-cols-[132px_1fr] sm:gap-8">
          <div className="h-24 w-24 rounded-full bg-emberly-navy-soft sm:h-32 sm:w-32" />
          <div className="space-y-3 pt-2">
            <div className="h-6 w-40 rounded bg-emberly-navy-soft" />
            <div className="h-4 w-64 rounded bg-emberly-navy-soft" />
            <div className="h-4 w-52 rounded bg-emberly-navy-soft" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 min-[360px]:grid-cols-3 sm:gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-emberly-navy-soft" />)}
        </div>
      </div>
    </main>
  );
}

function PostThumb({ post, index }) {
  const media = post.media?.[0];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: Math.min(index * 0.025, 0.2) }}>
      <Link to={`/post/${post.id}`} className="group relative block aspect-square overflow-hidden bg-emberly-navy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emberly-blue">
        {media?.resourceType === 'video' ? (
          <video src={media.url} muted playsInline preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <img src={post.imageUrl || media?.url} alt={post.caption || 'Post'} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-5 bg-emberly-navy/0 text-white opacity-0 transition group-hover:bg-emberly-navy/55 group-hover:opacity-100">
          <span className="text-sm font-semibold">♥ {post.likeCount}</span>
          <span className="text-sm font-semibold">♡ {post.commentCount}</span>
        </div>
        {post.media?.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-emberly-navy/85 px-2 py-1 text-[10px] font-bold text-emberly-ivory" aria-label={`${post.media.length} media items`}>{post.media.length} photos</span>}
      </Link>
    </motion.div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setNotFound(false);
    setEditing(false);
    api.get(`/users/${username}`).then((res) => {
      if (!active) return;
      setData(res.data);
      setBio(res.data.user.bio || '');
      setFullName(res.data.user.fullName || '');
    }).catch(() => { if (active) setNotFound(true); });
    return () => { active = false; };
  }, [username]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/users/me', { fullName, bio });
      updateUser(res.data.user);
      setData((current) => current ? { ...current, user: res.data.user } : current);
      setEditing(false);
      showToast('Profile updated');
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Choose an image file');
    if (file.size > 8 * 1024 * 1024) return showToast('Profile picture must be 8MB or smaller');
    setAvatarSaving(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.put('/users/me/avatar', form);
      updateUser(res.data.user);
      setData((current) => current ? { ...current, user: res.data.user } : current);
      showToast('Profile picture updated');
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not update profile picture');
    } finally {
      setAvatarSaving(false);
    }
  };

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}/${username}`);
      showToast('Profile link copied');
    } catch {
      showToast('Could not copy profile link');
    }
  };

  if (notFound) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emberly-crimson text-emberly-ivory"><Lock className="h-6 w-6" /></div>
        <h1 className="font-display text-2xl font-semibold text-emberly-ivory">Profile unavailable</h1>
        <p className="mt-2 text-sm text-emberly-blue-soft">No one goes by @{username} here.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-emberly-ivory px-5 py-2.5 text-sm font-semibold text-emberly-ink">Back to feed</Link>
      </main>
    );
  }

  if (!data) return <ProfileSkeleton />;

  const { user, postCount, followerCount, followingCount, relationship, isSelf, canViewContent, posts } = data;
  const updateRelationship = (next) => {
    setData((current) => {
      if (!current) return current;
      const wasFollowing = current.relationship === 'following';
      const isFollowing = next === 'following';
      return {
        ...current,
        relationship: next,
        followerCount: current.followerCount + (isFollowing && !wasFollowing ? 1 : (!isFollowing && wasFollowing ? -1 : 0)),
        canViewContent: current.isSelf || !current.user.isPrivate || isFollowing,
      };
    });
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-7 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-emberly-navy-soft/60">
        <div className="h-20 bg-gradient-to-r from-emberly-navy via-emberly-navy-soft to-emberly-crimson sm:h-32" />

        <div className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-11 flex flex-col items-center sm:-mt-16 sm:flex-row sm:items-end sm:gap-8">
            <div className="relative shrink-0">
              <div className="rounded-full bg-emberly-navy p-1.5 ring-1 ring-white/10">
                <Avatar user={user} size={104} ring={false} />
              </div>
              {isSelf && editing && (
                <>
                  <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} aria-label="Change profile picture" className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-emberly-navy bg-emberly-crimson text-emberly-ivory shadow-lg disabled:opacity-60">
                    {avatarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={uploadAvatar} />
                </>
              )}
            </div>

            <div className="min-w-0 w-full flex-1 pt-3 text-center sm:pt-0 sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-emberly-ivory sm:text-[28px]">{user.username}</h1>
                    {user.isPrivate && <Lock className="h-4 w-4 text-emberly-blue-soft" />}
                  </div>

                  <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm sm:justify-start">
                    <span><strong className="text-emberly-ivory">{postCount}</strong> <span className="text-emberly-blue-soft">posts</span></span>
                    <Link to={`/${user.username}/followers`} className="hover:text-emberly-ivory"><strong className="text-emberly-ivory">{followerCount}</strong> <span className="text-emberly-blue-soft">followers</span></Link>
                    <Link to={`/${user.username}/following`} className="hover:text-emberly-ivory"><strong className="text-emberly-ivory">{followingCount}</strong> <span className="text-emberly-blue-soft">following</span></Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  {isSelf ? (
                    <>
                      <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-full border border-white/15 bg-emberly-navy px-4 py-2 text-sm font-semibold text-emberly-ivory transition hover:border-emberly-blue/60">{editing ? 'Cancel' : 'Edit profile'}</button>
                      <Link to="/settings" aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-emberly-blue-soft transition hover:bg-emberly-navy hover:text-emberly-ivory"><Settings2 className="h-4 w-4" /></Link>
                    </>
                  ) : me ? (
                    <>
                      <FollowButton username={user.username} initialRelationship={relationship} isPrivateTarget={user.isPrivate} onChange={updateRelationship} />
                      <button type="button" onClick={copyProfileLink} aria-label="Copy profile link" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-emberly-blue-soft transition hover:bg-emberly-navy hover:text-emberly-ivory"><Link2 className="h-4 w-4" /></button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center sm:mt-5 sm:text-left">
            {user.fullName && <p className="text-sm font-semibold text-emberly-ivory">{user.fullName}</p>}
            {user.bio && <p className="mx-auto mt-1.5 max-w-2xl whitespace-pre-line text-sm leading-6 text-emberly-blue-soft sm:mx-0">{user.bio}</p>}
          </div>

          {editing && (
            <form onSubmit={saveProfile} className="mx-auto mt-5 grid max-w-xl gap-3 sm:mx-0 sm:grid-cols-2">
              <label className="sr-only" htmlFor="profile-full-name">Full name</label>
              <input id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-xl border border-white/10 bg-emberly-navy px-3.5 py-2.5 text-sm text-emberly-ivory outline-none focus:border-emberly-blue" placeholder="Full name" />
              <label className="sr-only" htmlFor="profile-bio">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={2} maxLength={200} className="resize-none rounded-xl border border-white/10 bg-emberly-navy px-3.5 py-2.5 text-sm text-emberly-ivory outline-none focus:border-emberly-blue sm:col-span-2" placeholder="Bio" />
              <button type="submit" disabled={saving} className="w-fit rounded-full bg-emberly-crimson px-5 py-2.5 text-sm font-semibold text-emberly-ivory hover:bg-emberly-crimson-dark disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
            </form>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emberly-ivory"><Grid3X3 className="h-4 w-4 text-emberly-blue" /> Posts</div>
          <button type="button" aria-label="More profile options" className="rounded-full p-2 text-emberly-blue-soft hover:bg-emberly-navy-soft hover:text-emberly-ivory"><MoreHorizontal className="h-5 w-5" /></button>
        </div>

        {!canViewContent ? (
          <div className="mx-auto max-w-sm py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-emberly-navy-soft"><Lock className="h-6 w-6 text-emberly-blue" /></div>
            <h2 className="mt-4 font-display text-xl font-semibold text-emberly-ivory">This account is private</h2>
            <p className="mt-1 text-sm text-emberly-blue-soft">Follow {user.username} to see their posts.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emberly-ivory text-emberly-ink"><Camera className="h-6 w-6" /></div>
            <h2 className="mt-4 font-display text-xl font-semibold text-emberly-ivory">Nothing here yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-emberly-blue-soft">{isSelf ? 'Share your first moment on Emberly and start shaping your profile.' : `${user.username} hasn't shared anything yet.`}</p>{isSelf && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('emberly:open-create'))} className="mt-5 inline-flex items-center gap-2 rounded-full bg-emberly-crimson px-4 py-2.5 text-xs font-bold text-emberly-ivory transition hover:bg-emberly-crimson-dark"><Camera className="h-4 w-4" /> Create your first post</button>}
          </div>
        ) : (
          <div className="mt-4 grid w-full grid-cols-2 gap-1 min-[360px]:grid-cols-3 sm:gap-2">
            {posts.map((post, index) => <PostThumb key={post.id} post={post} index={index} />)}
          </div>
        )}
      </section>
    </main>
  );
}
