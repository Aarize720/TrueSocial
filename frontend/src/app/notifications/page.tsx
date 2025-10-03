// Page des notifications
'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notification } from '@/types';
import { api } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';
import {
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  UserPlusIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
} from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications', {
        params: { type: activeTab === 'all' ? undefined : 'following' }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIconSolid className="w-6 h-6 text-red-500" />;
      case 'comment':
        return <ChatBubbleOvalLeftIcon className="w-6 h-6 text-blue-500" />;
      case 'follow':
        return <UserPlusIcon className="w-6 h-6 text-green-500" />;
      default:
        return <BellIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'a aimé votre publication';
      case 'comment':
        return 'a commenté votre publication';
      case 'follow':
        return 'a commencé à vous suivre';
      case 'mention':
        return 'vous a mentionné dans un commentaire';
      default:
        return notification.message || '';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Rediriger selon le type de notification
    if (notification.postId) {
      // Rediriger vers le post
      window.location.href = `/post/${notification.postId}`;
    } else if (notification.fromUser) {
      // Rediriger vers le profil
      window.location.href = `/profile/${notification.fromUser.username}`;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                Tout marquer comme lu
              </Button>
            )}
          </div>

          {/* Onglets */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes
              {unreadCount > 0 && activeTab === 'all' && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'following'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Abonnements
            </button>
          </div>
        </div>

        {/* Liste des notifications */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellIcon className="h-12 w-12 text-gray-400" />}
            title="Aucune notification"
            description={
              activeTab === 'all'
                ? "Vous n'avez aucune notification pour le moment."
                : "Aucune notification de vos abonnements."
            }
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar de l'utilisateur */}
                  <div className="relative">
                    <Avatar
                      src={notification.fromUser?.profilePicture}
                      alt={notification.fromUser?.username || 'User'}
                      size="sm"
                    />
                    {/* Icône du type de notification */}
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Contenu de la notification */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">
                          {notification.fromUser?.username}
                        </span>{' '}
                        {getNotificationText(notification)}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt))}
                    </p>

                    {/* Message supplémentaire */}
                    {notification.message && notification.type !== 'follow' && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  {/* Miniature du post si applicable */}
                  {notification.post?.mediaUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={notification.post.mediaUrl}
                        alt="Post"
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Bouton de suivi pour les notifications de follow */}
                  {notification.type === 'follow' && (
                    <div className="flex-shrink-0">
                      <Button variant="primary" size="sm">
                        Suivre
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bouton pour charger plus */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={fetchNotifications}>
              Charger plus
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}