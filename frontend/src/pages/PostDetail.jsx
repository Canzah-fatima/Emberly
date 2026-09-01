import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';
import PostMenu from '../components/PostMenu';
import Caption from '../components/Caption';
import PostMedia from '../components/PostMedia';
import CommentSection from '../components/CommentSection';
import ConfirmDialog from '../components/ConfirmDialog';
import ReportModal from '../components/ReportModal';
import { CommentIcon, ShareIcon } from '../components/icons';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then((res) => {
        setPost(res.data.post);
        setLiked(res.data.post.liked);
        setLikeCount(res.data.post.likeCount);
        setCommentCount(res.data.post.commentCount);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const deletePost = async () => {
    setConfirmDelete(false);
    await api.delete(`/posts/${id}`);
    showToast('Post deleted');
    navigate(`/${post.author.username}`);
  };

  const unfollow = async () => {
    try {
      await api.post(`/users/${post.author.username}/follow`);
      showToast(`Unfollowed @${post.author.username}`);
    } catch { /* ignore */ }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${id}`;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(url).then(() => showToast('Link copied'));
    }
  };

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="font-display text-xl mb-2">This post is no longer available.</p>
        <Link to="/" className="text-emberly-crimson-soft hover:text-emberly-crimson font-medium">Back to feed</Link>
      </div>
    );
  }

  if (!post) {
    return <div className="max-w-lg mx-auto px-4 py-8"><div className="aspect-square rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-soft/35 rounded-2xl animate-pulse" /></div>;
  }

  const isOwner = user && user.username === post.author.username;

  return (
    <div className="post-detail-page max-w-lg mx-auto px-4 py-4 lg:py-8">
      <div className="rounded-2xl border border-emberly-ivory/10 bg-emberly-navy-soft/35 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={`/${post.author.username}`}><Avatar user={post.author} size={36} /></Link>
            <div>
              <Link to={`/${post.author.username}`} className="font-medium hover:text-emberly-crimson-soft transition-colors">
                {post.author.username}
              </Link>
              <p className="text-xs text-emberly-ivory/45">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <PostMenu
            isOwner={isOwner}
            username={post.author.username}
            onDelete={() => setConfirmDelete(true)}
            onReport={() => setReportOpen(true)}
            onUnfollow={unfollow}
          />
        </div>

        <PostMedia media={post.media?.length ? post.media : (post.imageUrl ? [{ url: post.imageUrl }] : [])} alt={post.caption} maxHeight={760} />

        <div className="p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LikeButton postId={post.id} liked={liked} count={likeCount} onLiked={(l, c) => { setLiked(l); setLikeCount(c); }} />
              <span className="flex items-center gap-1.5 text-emberly-ivory/45">
                <CommentIcon className="w-6 h-6" />
                <span className="text-sm tabular-nums">{commentCount}</span>
              </span>
              <button onClick={share} className="text-emberly-ivory/45 hover:text-emberly-ivory transition-colors">
                <ShareIcon className="w-6 h-6" />
              </button>
            </div>
            <SaveButton postId={post.id} initialSaved={post.saved} />
          </div>

          {likeCount > 0 && (
            <p className="text-sm font-medium">
              {post.likeSampleUser ? (
                <>Liked by <Link to={`/${post.likeSampleUser}`} className="hover:underline">{post.likeSampleUser}</Link>{likeCount > 1 ? ` and ${likeCount - 1} other${likeCount - 1 === 1 ? '' : 's'}` : ''}</>
              ) : (
                `${likeCount} like${likeCount === 1 ? '' : 's'}`
              )}
            </p>
          )}

          <Caption
            username={post.author.username}
            text={post.caption}
            expanded={captionExpanded}
            onToggle={() => setCaptionExpanded((v) => !v)}
            limit={280}
          />

          <div className="pt-1">
            <CommentSection postId={post.id} onCountChange={setCommentCount} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        description="This post will be permanently removed."
        confirmLabel="Delete"
        onConfirm={deletePost}
        onCancel={() => setConfirmDelete(false)}
      />

      {reportOpen && <ReportModal onClose={() => setReportOpen(false)} />}
    </div>
  );
}
