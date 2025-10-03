// Composant InfiniteScroll réutilisable
import React, { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { LoadingSpinner } from './LoadingSpinner';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loader?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  loader,
  threshold = 0.1,
  rootMargin = '100px',
  className,
}) => {
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
  });

  const loadingRef = useRef(false);

  useEffect(() => {
    if (inView && hasMore && !isLoading && !loadingRef.current) {
      loadingRef.current = true;
      onLoadMore();
      
      // Reset loading flag after a short delay
      setTimeout(() => {
        loadingRef.current = false;
      }, 1000);
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <div className={className}>
      {children}
      
      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          {isLoading ? (
            loader || <LoadingSpinner text="Chargement..." />
          ) : (
            <div className="h-4" /> // Espace pour déclencher le chargement
          )}
        </div>
      )}
      
      {!hasMore && (
        <div className="flex justify-center py-8">
          <p className="text-gray-500 text-sm">
            Vous avez vu tous les posts disponibles
          </p>
        </div>
      )}
    </div>
  );
};