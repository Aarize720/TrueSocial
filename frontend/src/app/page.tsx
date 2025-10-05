// Page d'accueil - Feed principal
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { CreatePostButton } from '@/components/posts/CreatePostButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { Camera, Users, Heart } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { 
    posts, 
    isLoading, 
    isLoadingMore, 
    hasMore, 
    error,
    fetchFeed, 
    loadMorePosts 
  } = usePostStore();

  // Rediriger vers la page de connexion si non authentifié
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Charger le feed au montage
  useEffect(() => {
    if (isAuthenticated) {
      fetchFeed();
    }
  }, [isAuthenticated, fetchFeed]);

  // Afficher un loader pendant l'initialisation
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirection en cours
  if (!isAuthenticated) {
    return null;
  }

  const handleRefresh = async () => {
    await fetchFeed(true);
  };

  const handleLoadMore = async () => {
    if (!isLoadingMore && hasMore) {
      await loadMorePosts();
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Barre des stories */}
        <div className="mb-6">
          <StoriesBar />
        </div>

        {/* Bouton de création de post */}
        <div className="mb-6">
          <CreatePostButton />
        </div>

        {/* Bouton de rafraîchissement */}
        <div className="mb-4 flex justify-center">
          <RefreshButton onRefresh={handleRefresh} isLoading={isLoading} />
        </div>

        {/* Gestion des erreurs */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        {isLoading && posts.length === 0 ? (
          // Skeleton loading pour le premier chargement
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          // État vide
          <EmptyState
            icon={<Camera className="h-12 w-12 text-gray-400" />}
            title="Aucun post à afficher"
            description="Commencez à suivre des utilisateurs pour voir leurs publications dans votre feed."
            action={{
              label: "Découvrir des utilisateurs",
              onClick: () => router.push('/explore'),
            }}
          />
        ) : (
          // Liste des posts avec scroll infini
          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={handleLoadMore}
            loader={<PostCardSkeleton />}
          >
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </InfiniteScroll>
        )}

        {/* Suggestions pour les nouveaux utilisateurs */}
        {posts.length === 0 && !isLoading && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bienvenue sur TrueSocial !
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Trouvez des amis</h4>
                  <p className="text-sm text-gray-600">
                    Recherchez et suivez vos amis pour voir leurs publications.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Camera className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Partagez vos moments</h4>
                  <p className="text-sm text-gray-600">
                    Créez votre premier post pour commencer à partager avec vos amis.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Interagissez</h4>
                  <p className="text-sm text-gray-600">
                    Likez et commentez les publications de vos amis.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => router.push('/explore')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Explorer
              </button>
              <button
                onClick={() => router.push('/create')}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
              >
                Créer un post
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// Composant skeleton pour le loading des posts
const PostCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-200"></div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>

        {/* Likes */}
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>

        {/* Caption */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Comments */}
        <div className="mt-2">
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Time */}
        <div className="mt-2">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
};