// Page de recherche
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { User, Post } from '@/types';
import { api } from '@/lib/api';
import { debounce } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  UserIcon,
  HashtagIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

type SearchTab = 'all' | 'users' | 'hashtags' | 'posts';

interface SearchResults {
  users: User[];
  posts: Post[];
  hashtags: Array<{ tag: string; count: number }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<SearchResults>({
    users: [],
    posts: [],
    hashtags: [],
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularHashtags, setPopularHashtags] = useState<Array<{ tag: string; count: number }>>([]);

  // Charger les recherches récentes et hashtags populaires au montage
  useEffect(() => {
    loadRecentSearches();
    loadPopularHashtags();
  }, []);

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const loadPopularHashtags = async () => {
    try {
      const response = await api.get('/hashtags/popular');
      setPopularHashtags(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des hashtags populaires:', error);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], posts: [], hashtags: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/search', {
        params: { q: searchQuery, type: activeTab === 'all' ? undefined : activeTab }
      });
      setResults(response.data);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce la recherche
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => performSearch(searchQuery), 300),
    [activeTab]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const tabs = [
    { id: 'all' as SearchTab, label: 'Tout', icon: MagnifyingGlassIcon },
    { id: 'users' as SearchTab, label: 'Utilisateurs', icon: UserIcon },
    { id: 'hashtags' as SearchTab, label: 'Hashtags', icon: HashtagIcon },
    { id: 'posts' as SearchTab, label: 'Publications', icon: PhotoIcon },
  ];

  const hasResults = results.users.length > 0 || results.posts.length > 0 || results.hashtags.length > 0;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Barre de recherche */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des utilisateurs, hashtags ou publications..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Onglets */}
          <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu */}
        {!query.trim() ? (
          // État initial - recherches récentes et hashtags populaires
          <div className="space-y-6">
            {/* Recherches récentes */}
            {recentSearches.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recherches récentes</h2>
                  <button
                    onClick={clearRecentSearches}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Effacer tout
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="flex items-center w-full p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags populaires */}
            {popularHashtags.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hashtags populaires</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {popularHashtags.map((hashtag) => (
                    <button
                      key={hashtag.tag}
                      onClick={() => setQuery(`#${hashtag.tag}`)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <HashtagIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">#{hashtag.tag}</p>
                          <p className="text-sm text-gray-500">{hashtag.count} publications</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          // État de chargement
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !hasResults ? (
          // Aucun résultat
          <EmptyState
            title="Aucun résultat trouvé"
            description={`Aucun résultat pour "${query}". Essayez avec d'autres mots-clés.`}
          />
        ) : (
          // Résultats de recherche
          <div className="space-y-6">
            {/* Utilisateurs */}
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisateurs</h2>
                <div className="space-y-3">
                  {results.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <Link href={`/profile/${user.username}`} className="flex items-center space-x-3 flex-1">
                        <Avatar src={user.profilePicture} alt={user.username} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{user.username}</p>
                          {user.bio && (
                            <p className="text-sm text-gray-600 truncate max-w-xs">{user.bio}</p>
                          )}
                        </div>
                      </Link>
                      <Button variant="outline" size="sm">
                        Suivre
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.hashtags.map((hashtag) => (
                    <button
                      key={hashtag.tag}
                      onClick={() => setQuery(`#${hashtag.tag}`)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <HashtagIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">#{hashtag.tag}</p>
                          <p className="text-sm text-gray-500">{hashtag.count} publications</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Publications */}
            {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Publications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.posts.map((post) => (
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
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}