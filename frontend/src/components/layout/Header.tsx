// Header mobile
import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { PlusIcon, HeartIcon } from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          TrueSocial
        </Link>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Link
            href="/create"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <PlusIcon className="w-6 h-6" />
          </Link>
          
          <Link
            href="/notifications"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <HeartIcon className="w-6 h-6" />
          </Link>

          {user && (
            <Link href="/profile">
              <Avatar
                src={user.profilePicture}
                alt={user.username}
                size="sm"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};