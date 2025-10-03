// Barre des stories en haut du feed (version mise à jour)
import React, { useEffect, useState } from 'react';
import { Story } from '@/types';
import { api } from '@/lib/api';
import { StoryItem } from './StoryItem';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';

export const StoriesBar: React.FC = () => {
  const { user } = useAuthStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await api.get('/stories');
        setStories(response.data);
      } catch (error) {
        console.error('Erreur lors du chargement des stories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
        {/* Ajouter une story */}
        {user && (
          <div className="flex flex-col items-center space-y-2 flex-shrink-0">
            <div className="relative">
              <Avatar
                src={user.profilePicture}
                alt={user.username}
                size="lg"
              />
              <button className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1 border-2 border-white">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-gray-600 text-center">Votre story</span>
          </div>
        )}

        {/* Stories des autres utilisateurs */}
        {stories.map((story) => (
          <StoryItem key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
};