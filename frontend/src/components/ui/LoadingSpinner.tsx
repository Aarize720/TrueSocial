// Composant LoadingSpinner réutilisable
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  white: 'text-white',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  color = 'primary',
  text,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )} 
      />
      {text && (
        <p className={cn(
          'mt-2 text-sm',
          colorClasses[color]
        )}>
          {text}
        </p>
      )}
    </div>
  );
};