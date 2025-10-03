// Navigation mobile en bas d'écran
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
];

export const MobileNavigation: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}

        {/* Profil */}
        {user && (
          <Link
            href="/profile"
            className={`flex flex-col items-center p-2 transition-colors ${
              pathname === '/profile' ? 'text-gray-900' : 'text-gray-600'
            }`}
          >
            <Avatar
              src={user.profilePicture}
              alt={user.username}
              size="xs"
            />
          </Link>
        )}
      </div>
    </nav>
  );
};