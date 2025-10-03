// Composant Avatar réutilisable
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallback?: React.ReactNode;
  onClick?: () => void;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  showBorder?: boolean;
  borderColor?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
};

const onlineStatusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  className,
  fallback,
  onClick,
  showOnlineStatus = false,
  isOnline = false,
  showBorder = false,
  borderColor = 'border-gray-200',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }

    return (
      <div className={cn(
        'flex items-center justify-center bg-gray-100 text-gray-500',
        sizeClasses[size],
        'rounded-full'
      )}>
        <User size={size === 'xs' ? 12 : size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : size === 'xl' ? 32 : 40} />
      </div>
    );
  };

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'relative overflow-hidden rounded-full',
          sizeClasses[size],
          showBorder && `border-2 ${borderColor}`,
          onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        onClick={onClick}
      >
        {src && !imageError ? (
          <>
            {isLoading && (
              <div className={cn(
                'absolute inset-0 bg-gray-100 animate-pulse rounded-full',
                sizeClasses[size]
              )} />
            )}
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
              sizes={`${size === 'xs' ? '24px' : size === 'sm' ? '32px' : size === 'md' ? '40px' : size === 'lg' ? '48px' : size === 'xl' ? '64px' : '80px'}`}
            />
          </>
        ) : (
          renderFallback()
        )}
      </div>

      {/* Indicateur de statut en ligne */}
      {showOnlineStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            onlineStatusSizes[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
};

// Composant AvatarGroup pour afficher plusieurs avatars
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    alt?: string;
    id: string;
  }>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  max?: number;
  className?: string;
  onAvatarClick?: (id: string) => void;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  size = 'md',
  max = 3,
  className,
  onAvatarClick,
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const overlapClass = size === 'xs' ? '-ml-1' : size === 'sm' ? '-ml-1.5' : '-ml-2';

  return (
    <div className={cn('flex items-center', className)}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={avatar.id}
          className={cn(
            index > 0 && overlapClass,
            'relative'
          )}
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            size={size}
            showBorder
            borderColor="border-white"
            onClick={() => onAvatarClick?.(avatar.id)}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-medium rounded-full border-2 border-white',
            sizeClasses[size],
            overlapClass
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};