// Bouton pour créer un nouveau post
import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { PlusIcon } from '@heroicons/react/24/outline';

export const CreatePostButton: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Link href="/create">
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center space-x-3">
          <Avatar
            src={user.profilePicture}
            alt={user.username}
            size="sm"
          />
          <div className="flex-1">
            <p className="text-gray-500 text-sm">
              Quoi de neuf, {user.username} ?
            </p>
          </div>
          <div className="bg-blue-500 text-white rounded-full p-2">
            <PlusIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </Link>
  );
};