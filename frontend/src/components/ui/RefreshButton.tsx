// Composant RefreshButton réutilisable
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeClasses = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isLoading = false,
  className,
  size = 'md',
  showText = false,
}) => {
  return (
    <button
      onClick={onRefresh}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      aria-label="Actualiser"
    >
      <RefreshCw 
        size={iconSizes[size]} 
        className={cn(
          'text-gray-600',
          isLoading && 'animate-spin',
          showText && 'mr-2'
        )} 
      />
      {showText && (
        <span className="text-sm font-medium text-gray-700">
          {isLoading ? 'Actualisation...' : 'Actualiser'}
        </span>
      )}
    </button>
  );
};