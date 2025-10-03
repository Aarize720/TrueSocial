/**
 * Routes pour l'upload de fichiers
 * Images, vidéos, traitement et optimisation
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

const { requireAuth } = require('../config/passport');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { uploadValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration Multer pour l'upload temporaire
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtres de fichiers
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.'), false);
  }
};

const videoFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Type de vidéo non supporté. Utilisez MP4, WebM ou MOV.'), false);
  }
};

// Configuration Multer pour images
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB par défaut
    files: 10 // Maximum 10 fichiers
  }
});

// Configuration Multer pour vidéos
const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB pour les vidéos
    files: 1 // Une seule vidéo à la fois
  }
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload et traitement d'images
 * @access  Private
 */
router.post('/image',
  requireAuth,
  uploadImage.array('images', 10),
  validateRequest(uploadValidation.uploadImage),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new ValidationError('Aucun fichier fourni');
    }

    const { type, quality = 80, width, height } = req.body;
    const userId = req.user.id;
    const uploadedImages = [];

    try {
      for (const file of req.files) {
        // Traitement de l'image avec Sharp
        let sharpInstance = sharp(file.path);
        
        // Obtenir les métadonnées de l'image
        const metadata = await sharpInstance.metadata();
        
        // Redimensionnement selon le type
        switch (type) {
          case 'avatar':
            sharpInstance = sharpInstance.resize(400, 400, {
              fit: 'cover',
              position: 'center'
            });
            break;
          case 'post':
            // Limiter la taille maximale tout en gardant le ratio
            const maxSize = 1080;
            if (metadata.width > maxSize || metadata.height > maxSize) {
              sharpInstance = sharpInstance.resize(maxSize, maxSize, {
                fit: 'inside',
                withoutEnlargement: true
              });
            }
            break;
          case 'story':
            // Format story (9:16)
            sharpInstance = sharpInstance.resize(1080, 1920, {
              fit: 'cover',
              position: 'center'
            });
            break;
          default:
            // Redimensionnement personnalisé si fourni
            if (width && height) {
              sharpInstance = sharpInstance.resize(parseInt(width), parseInt(height), {
                fit: 'cover',
                position: 'center'
              });
            }
        }

        // Optimisation et conversion
        const processedBuffer = await sharpInstance
          .jpeg({ quality: parseInt(quality), progressive: true })
          .toBuffer();

        // Upload vers Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `truesocial/${type}s`,
              public_id: `${userId}_${uuidv4()}`,
              resource_type: 'image',
              format: 'jpg',
              transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(processedBuffer);
        });

        uploadedImages.push({
          originalName: file.originalname,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        });

        // Supprimer le fichier temporaire
        await fs.unlink(file.path);
      }

      logger.info(`${uploadedImages.length} images uploadées par ${req.user.username}`);

      res.json({
        message: `${uploadedImages.length} image(s) uploadée(s) avec succès`,
        images: uploadedImages
      });

    } catch (error) {
      // Nettoyer les fichiers temporaires en cas d'erreur
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error('Erreur suppression fichier temporaire:', unlinkError);
        }
      }
      throw error;
    }
  })
);

/**
 * @route   POST /api/upload/video
 * @desc    Upload et traitement de vidéos
 * @access  Private
 */
router.post('/video',
  requireAuth,
  uploadVideo.single('video'),
  validateRequest(uploadValidation.uploadVideo),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('Aucun fichier vidéo fourni');
    }

    const { type, quality = 'medium', maxDuration = 30 } = req.body;
    const userId = req.user.id;

    try {
      // Upload vers Cloudinary avec transformation vidéo
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          req.file.path,
          {
            folder: `truesocial/${type}s`,
            public_id: `${userId}_${uuidv4()}`,
            resource_type: 'video',
            video_codec: 'h264',
            audio_codec: 'aac',
            transformation: [
              { 
                quality: quality === 'high' ? '80' : quality === 'low' ? '40' : '60',
                video_codec: 'h264',
                audio_codec: 'aac'
              },
              { duration: maxDuration }, // Limiter la durée
              type === 'story' ? { width: 1080, height: 1920, crop: 'fill' } : { width: 1080, crop: 'scale' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      // Générer une thumbnail
      const thumbnailResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          req.file.path,
          {
            folder: `truesocial/${type}s/thumbnails`,
            public_id: `${uploadResult.public_id}_thumb`,
            resource_type: 'video',
            format: 'jpg',
            transformation: [
              { start_offset: '1' }, // Prendre la frame à 1 seconde
              { width: 400, height: 400, crop: 'fill', quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      // Supprimer le fichier temporaire
      await fs.unlink(req.file.path);

      const videoData = {
        originalName: req.file.originalname,
        url: uploadResult.secure_url,
        thumbnailUrl: thumbnailResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        duration: uploadResult.duration,
        bytes: uploadResult.bytes
      };

      logger.info(`Vidéo uploadée par ${req.user.username}: ${uploadResult.public_id}`);

      res.json({
        message: 'Vidéo uploadée avec succès',
        video: videoData
      });

    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Erreur suppression fichier temporaire:', unlinkError);
      }
      throw error;
    }
  })
);

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload spécifique pour avatar utilisateur
 * @access  Private
 */
router.post('/avatar',
  requireAuth,
  uploadImage.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('Aucun fichier avatar fourni');
    }

    const userId = req.user.id;

    try {
      // Traitement spécifique pour avatar (carré, 400x400)
      const processedBuffer = await sharp(req.file.path)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();

      // Upload vers Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'truesocial/avatars',
            public_id: `avatar_${userId}`,
            resource_type: 'image',
            format: 'jpg',
            overwrite: true, // Remplacer l'ancien avatar
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(processedBuffer);
      });

      // Mettre à jour l'avatar en base de données
      const { db } = require('../config/database');
      await db.query(
        'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
        [uploadResult.secure_url, userId]
      );

      // Supprimer le fichier temporaire
      await fs.unlink(req.file.path);

      logger.info(`Avatar mis à jour pour ${req.user.username}`);

      res.json({
        message: 'Avatar mis à jour avec succès',
        avatarUrl: uploadResult.secure_url
      });

    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Erreur suppression fichier temporaire:', unlinkError);
      }
      throw error;
    }
  })
);

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Supprimer un fichier uploadé
 * @access  Private
 */
router.delete('/:publicId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const userId = req.user.id;

    // Vérifier que le fichier appartient à l'utilisateur
    if (!publicId.includes(userId)) {
      throw new ValidationError('Vous ne pouvez supprimer que vos propres fichiers');
    }

    try {
      // Supprimer de Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        logger.info(`Fichier supprimé par ${req.user.username}: ${publicId}`);
        
        res.json({
          message: 'Fichier supprimé avec succès',
          publicId
        });
      } else {
        throw new ValidationError('Fichier non trouvé ou déjà supprimé');
      }

    } catch (error) {
      logger.error('Erreur suppression Cloudinary:', error);
      throw new ValidationError('Erreur lors de la suppression du fichier');
    }
  })
);

/**
 * @route   GET /api/upload/signed-url
 * @desc    Générer une URL signée pour upload direct (optionnel)
 * @access  Private
 */
router.get('/signed-url',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type = 'post' } = req.query;
    const userId = req.user.id;

    // Générer les paramètres de signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder: `truesocial/${type}s`,
      public_id: `${userId}_${uuidv4()}`,
      transformation: type === 'avatar' ? 'w_400,h_400,c_fill' : 'q_auto:good'
    };

    // Générer la signature
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: params.folder,
      publicId: params.public_id,
      transformation: params.transformation
    });
  })
);

/**
 * Middleware de gestion d'erreurs spécifique à Multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'Erreur lors de l\'upload';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Fichier trop volumineux';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Trop de fichiers';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Champ de fichier inattendu';
        break;
    }
    
    return res.status(400).json({
      error: message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  next(error);
});

module.exports = router;