// Sidebar de navigation desktop
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  HeartIcon,
  UserIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  PlusCircleIcon as PlusIconSolid,
  HeartIcon as HeartIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';

const navigationItems = [
  {
    name: 'Accueil',
    href: '/',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    name: 'Rechercher',
    href: '/search',
    icon: MagnifyingGlassIcon,
    activeIcon: SearchIconSolid,
  },
  {
    name: 'Créer',
    href: '/create',
    icon: PlusCircleIcon,
    activeIcon: PlusIconSolid,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: HeartIcon,
    activeIcon: HeartIconSolid,
  },
  {
    name: 'Profil',
    href: '/profile',
    icon: UserIcon,
    activeIcon: UserIconSolid,
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            TrueSocial
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = isActive ? item.activeIcon : item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-6 h-6 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profil utilisateur */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar
                src={user.profilePicture}
                alt={user.username}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Se déconnecter"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};