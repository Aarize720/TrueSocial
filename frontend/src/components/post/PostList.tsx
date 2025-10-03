// Liste des posts avec scroll infini
import React, { useEffect } from 'react';
import { usePostStore } from '@/store/postStore';
import { PostCard } from './PostCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';

export const PostList: React.FC = () => {
  const { 
    posts, 
    loading, 
    error, 
    hasMore, 
    fetchPosts, 
    fetchMorePosts 
  } = usePostStore();

  useEffect(() => {
    if (posts.length === 0) {
      fetchPosts();
    }
  }, [posts.length, fetchPosts]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <EmptyState
        title="Erreur de chargement"
        description="Impossible de charger les posts. Veuillez réessayer."
        action={{
          label: "Réessayer",
          onClick: () => fetchPosts()
        }}
      />
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Aucun post"
        description="Commencez à suivre des utilisateurs pour voir leurs posts dans votre feed."
      />
    );
  }

  return (
    <InfiniteScroll
      hasMore={hasMore}
      loadMore={fetchMorePosts}
      loading={loading}
    >
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        
        {loading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </InfiniteScroll>
  );
};