// Item individuel d'une story (version mise à jour)
import React from 'react';
import { Story } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface StoryItemProps {
  story: Story;
  onClick?: () => void;
}

export const StoryItem: React.FC<StoryItemProps> = ({ story, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // TODO: Ouvrir le viewer de story
      console.log('Ouvrir story:', story.id);
    }
  };

  return (
    <div 
      className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        {/* Gradient border pour les stories non vues */}
        <div className="p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full">
          <div className="bg-white p-0.5 rounded-full">
            <Avatar
              src={story.user.profilePicture}
              alt={story.user.username}
              size="lg"
            />
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-600 text-center max-w-[60px] truncate">
        {story.user.username}
      </span>
    </div>
  );
};