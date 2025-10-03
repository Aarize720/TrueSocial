// Page de création de post
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import { validateFile } from '@/lib/utils';
import {
  PhotoIcon,
  VideoCameraIcon,
  XMarkIcon,
  MapPinIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createPost } = usePostStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Fichier invalide');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Créer une URL de prévisualisation
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Veuillez sélectionner une image ou une vidéo');
      return;
    }

    if (!caption.trim()) {
      setError('Veuillez ajouter une description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('caption', caption.trim());
      if (location.trim()) {
        formData.append('location', location.trim());
      }

      await createPost(formData);
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la création du post:', error);
      setError('Erreur lors de la publication. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    router.back();
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Annuler
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Nouvelle publication
            </h1>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || !caption.trim() || loading}
              size="sm"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Publier'}
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Zone de sélection de fichier */}
            {!selectedFile ? (
              <div className="p-8">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      <PhotoIcon className="w-12 h-12 text-gray-400" />
                      <VideoCameraIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Sélectionnez une photo ou une vidéo
                      </h3>
                      <p className="text-gray-600">
                        Glissez-déposez ou cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Formats supportés: JPG, PNG, GIF, MP4, MOV (max 50MB)
                      </p>
                    </div>
                    <Button type="button" variant="primary">
                      Choisir un fichier
                    </Button>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prévisualisation du média */}
                <div className="relative">
                  {selectedFile.type.startsWith('image/') ? (
                    <div className="relative aspect-square">
                      <Image
                        src={previewUrl}
                        alt="Prévisualisation"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-video">
                      <video
                        src={previewUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Formulaire de publication */}
                <div className="p-6 space-y-4">
                  {/* Utilisateur */}
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={user.profilePicture}
                      alt={user.username}
                      size="sm"
                    />
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>

                  {/* Description */}
                  <div>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Écrivez une description..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={2200}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <FaceSmileIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        {caption.length}/2200
                      </span>
                    </div>
                  </div>

                  {/* Localisation */}
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ajouter un lieu"
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Options avancées */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Options avancées
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Masquer le nombre de likes et de vues
                        </span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Désactiver les commentaires
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </MainLayout>
  );
}