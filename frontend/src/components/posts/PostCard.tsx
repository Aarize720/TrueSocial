// Composant pour afficher un post (version mise à jour)
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow } from '@/lib/utils';
import {
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuthStore();
  const { likePost, unlikePost } = usePostStore();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const isLiked = post.likes.some(like => like.userId === user?.id);
  const isBookmarked = false; // TODO: Implémenter les bookmarks

  const handleLike = async () => {
    if (!user) return;
    
    if (isLiked) {
      await unlikePost(post.id);
    } else {
      await likePost(post.id);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    // TODO: Implémenter l'ajout de commentaire
    setComment('');
  };

  return (
    <article className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Header du post */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${post.user.username}`}>
            <Avatar
              src={post.user.profilePicture}
              alt={post.user.username}
              size="sm"
            />
          </Link>
          <div>
            <Link
              href={`/profile/${post.user.username}`}
              className="font-semibold text-sm text-gray-900 hover:underline"
            >
              {post.user.username}
            </Link>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt))}
            </p>
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Contenu média */}
      {post.mediaUrl && (
        <div className="relative aspect-square">
          <Image
            src={post.mediaUrl}
            alt={post.caption || 'Post image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {isLiked ? (
                <HeartIconSolid className="w-6 h-6" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ChatBubbleOvalLeftIcon className="w-6 h-6" />
            </button>
            
            <button className="text-gray-700 hover:text-gray-900 transition-colors">
              <PaperAirplaneIcon className="w-6 h-6" />
            </button>
          </div>
          
          <button className={`transition-colors ${
            isBookmarked ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'
          }`}>
            {isBookmarked ? (
              <BookmarkIconSolid className="w-6 h-6" />
            ) : (
              <BookmarkIcon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Nombre de likes */}
        {post.likes.length > 0 && (
          <p className="font-semibold text-sm text-gray-900 mb-2">
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="mb-2">
            <span className="font-semibold text-sm text-gray-900 mr-2">
              {post.user.username}
            </span>
            <span className="text-sm text-gray-900">{post.caption}</span>
          </div>
        )}

        {/* Commentaires */}
        {post.comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            Voir les {post.comments.length} commentaires
          </button>
        )}

        {showComments && (
          <div className="space-y-2 mb-3">
            {post.comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <Avatar
                  src={comment.user.profilePicture}
                  alt={comment.user.username}
                  size="xs"
                />
                <div className="flex-1">
                  <span className="font-semibold text-sm text-gray-900 mr-2">
                    {comment.user.username}
                  </span>
                  <span className="text-sm text-gray-900">{comment.content}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(comment.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un commentaire */}
        {user && (
          <form onSubmit={handleComment} className="flex items-center space-x-3">
            <Avatar
              src={user.profilePicture}
              alt={user.username}
              size="xs"
            />
            <input
              type="text"
              placeholder="Ajouter un commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 text-sm border-none outline-none placeholder-gray-400"
            />
            {comment.trim() && (
              <button
                type="submit"
                className="text-sm font-semibold text-blue-500 hover:text-blue-700 transition-colors"
              >
                Publier
              </button>
            )}
          </form>
        )}
      </div>
    </article>
  );
};