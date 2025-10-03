// Page de profil utilisateur
'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PostCard } from '@/components/post/PostCard';
import { Post } from '@/types';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  CogIcon,
  PlusIcon,
  UserPlusIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${user?.id}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get(`/users/${user?.id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header du profil */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <Avatar
                src={user.profilePicture}
                alt={user.username}
                size="xl"
              />
              <button className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-2 border-2 border-white hover:bg-blue-600 transition-colors">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Informations du profil */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">
                  {user.username}
                </h1>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <CogIcon className="w-4 h-4 mr-2" />
                    Modifier le profil
                  </Button>
                </div>
              </div>

              {/* Statistiques */}
              <div className="flex justify-center md:justify-start space-x-8 mb-4">
                <div className="text-center">
                  <span className="block text-xl font-bold text-gray-900">
                    {formatNumber(stats.postsCount)}
                  </span>
                  <span className="text-sm text-gray-600">publications</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-bold text-gray-900">
                    {formatNumber(stats.followersCount)}
                  </span>
                  <span className="text-sm text-gray-600">abonnés</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-bold text-gray-900">
                    {formatNumber(stats.followingCount)}
                  </span>
                  <span className="text-sm text-gray-600">abonnements</span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <div className="mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}

              {/* Informations supplémentaires */}
              <div className="text-sm text-gray-600">
                <p>Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric'
                })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Publications
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'saved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Enregistrés
              </button>
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {activeTab === 'posts' && (
              <div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <PlusIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune publication
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Commencez à partager vos moments avec vos amis.
                    </p>
                    <Button variant="primary">
                      Créer votre première publication
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <div key={post.id} className="aspect-square relative group cursor-pointer">
                        <img
                          src={post.mediaUrl}
                          alt={post.caption || 'Post'}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                            <div className="flex items-center justify-center space-x-4">
                              <div className="flex items-center">
                                <span className="text-lg font-semibold">
                                  {post.likes.length}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-lg font-semibold">
                                  {post.comments.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <CogIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune publication enregistrée
                </h3>
                <p className="text-gray-600">
                  Les publications que vous enregistrez apparaîtront ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}