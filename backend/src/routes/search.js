/**
 * Routes pour la recherche
 * Utilisateurs, posts, hashtags, recherche globale
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth } = require('../config/passport');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { searchValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Recherche globale (utilisateurs, posts, hashtags)
 * @access  Private
 */
router.get('/',
  requireAuth,
  validateRequest(searchValidation.search, 'query'),
  asyncHandler(async (req, res) => {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Clé de cache
    const cacheKey = `search:${type}:${q}:${page}:${limit}:${userId}`;
    
    // Essayer de récupérer depuis le cache
    let cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      return res.json(cachedResults);
    }

    const results = {
      users: [],
      posts: [],
      hashtags: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: page > 1
      }
    };

    // Recherche d'utilisateurs
    if (type === 'all' || type === 'users') {
      const usersResult = await db.query(
        `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
                u.followers_count, u.posts_count,
                CASE 
                  WHEN f.id IS NOT NULL THEN true 
                  ELSE false 
                END as is_following,
                CASE 
                  WHEN fr.id IS NOT NULL THEN true 
                  ELSE false 
                END as follows_you,
                -- Score de pertinence
                CASE 
                  WHEN u.username ILIKE $1 THEN 4
                  WHEN u.full_name ILIKE $1 THEN 3
                  WHEN u.username ILIKE $2 THEN 2
                  WHEN u.full_name ILIKE $2 THEN 1
                  ELSE 0
                END as relevance_score
         FROM users u
         LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $3 AND f.status = 'accepted'
         LEFT JOIN follows fr ON fr.follower_id = u.id AND fr.following_id = $3 AND fr.status = 'accepted'
         WHERE u.is_active = true 
           AND u.id != $3
           AND (u.username ILIKE $2 OR u.full_name ILIKE $2)
         ORDER BY relevance_score DESC, u.followers_count DESC, u.username ASC
         LIMIT $4 OFFSET $5`,
        [`${q}%`, `%${q}%`, userId, type === 'users' ? limit : Math.min(limit, 10), offset]
      );

      results.users = usersResult.rows.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        postsCount: user.posts_count,
        isFollowing: user.is_following,
        followsYou: user.follows_you,
        relevanceScore: user.relevance_score
      }));
    }

    // Recherche de posts
    if (type === 'all' || type === 'posts') {
      const postsResult = await db.query(
        `SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
                p.hashtags, p.likes_count, p.comments_count, p.created_at,
                u.username, u.full_name, u.avatar_url, u.is_verified,
                CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked,
                -- Score de pertinence basé sur le caption et les hashtags
                CASE 
                  WHEN p.caption ILIKE $1 THEN 3
                  WHEN p.caption ILIKE $2 THEN 2
                  WHEN $3 = ANY(p.hashtags) THEN 4
                  WHEN EXISTS(SELECT 1 FROM unnest(p.hashtags) AS hashtag WHERE hashtag ILIKE $2) THEN 1
                  ELSE 0
                END as relevance_score
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $4
         WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
           AND (
             p.caption ILIKE $2 OR 
             $3 = ANY(p.hashtags) OR
             EXISTS(SELECT 1 FROM unnest(p.hashtags) AS hashtag WHERE hashtag ILIKE $2)
           )
           AND (
             NOT u.is_private OR 
             p.user_id = $4 OR
             p.user_id IN (
               SELECT following_id FROM follows 
               WHERE follower_id = $4 AND status = 'accepted'
             )
           )
         ORDER BY relevance_score DESC, p.likes_count DESC, p.created_at DESC
         LIMIT $5 OFFSET $6`,
        [
          `%${q}%`, 
          `%${q}%`, 
          q.toLowerCase().replace('#', ''), 
          userId, 
          type === 'posts' ? limit : Math.min(limit, 10), 
          offset
        ]
      );

      results.posts = postsResult.rows.map(post => ({
        id: post.id,
        user: {
          id: post.user_id,
          username: post.username,
          fullName: post.full_name,
          avatarUrl: post.avatar_url,
          isVerified: post.is_verified
        },
        caption: post.caption,
        mediaUrls: post.media_urls,
        mediaType: post.media_type,
        location: post.location,
        hashtags: post.hashtags || [],
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        isLiked: post.is_liked,
        createdAt: post.created_at,
        relevanceScore: post.relevance_score
      }));
    }

    // Recherche de hashtags
    if (type === 'all' || type === 'hashtags') {
      const hashtagsResult = await db.query(
        `SELECT hashtag, posts_count, trend_score, last_used_at,
                -- Score de pertinence
                CASE 
                  WHEN hashtag = $1 THEN 4
                  WHEN hashtag ILIKE $2 THEN 3
                  WHEN hashtag ILIKE $3 THEN 2
                  ELSE 1
                END as relevance_score
         FROM trending_hashtags
         WHERE hashtag ILIKE $3
         ORDER BY relevance_score DESC, trend_score DESC, posts_count DESC
         LIMIT $4 OFFSET $5`,
        [
          q.toLowerCase().replace('#', ''),
          `${q.toLowerCase().replace('#', '')}%`,
          `%${q.toLowerCase().replace('#', '')}%`,
          type === 'hashtags' ? limit : Math.min(limit, 10),
          offset
        ]
      );

      results.hashtags = hashtagsResult.rows.map(hashtag => ({
        hashtag: hashtag.hashtag,
        postsCount: hashtag.posts_count,
        trendScore: hashtag.trend_score,
        lastUsedAt: hashtag.last_used_at,
        relevanceScore: hashtag.relevance_score
      }));
    }

    // Calculer la pagination pour le type spécifique
    if (type !== 'all') {
      let totalQuery = '';
      let totalParams = [];

      switch (type) {
        case 'users':
          totalQuery = `
            SELECT COUNT(*) as total
            FROM users u
            WHERE u.is_active = true 
              AND u.id != $1
              AND (u.username ILIKE $2 OR u.full_name ILIKE $2)
          `;
          totalParams = [userId, `%${q}%`];
          break;

        case 'posts':
          totalQuery = `
            SELECT COUNT(*) as total
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
              AND (
                p.caption ILIKE $1 OR 
                $2 = ANY(p.hashtags) OR
                EXISTS(SELECT 1 FROM unnest(p.hashtags) AS hashtag WHERE hashtag ILIKE $1)
              )
              AND (
                NOT u.is_private OR 
                p.user_id = $3 OR
                p.user_id IN (
                  SELECT following_id FROM follows 
                  WHERE follower_id = $3 AND status = 'accepted'
                )
              )
          `;
          totalParams = [`%${q}%`, q.toLowerCase().replace('#', ''), userId];
          break;

        case 'hashtags':
          totalQuery = `
            SELECT COUNT(*) as total
            FROM trending_hashtags
            WHERE hashtag ILIKE $1
          `;
          totalParams = [`%${q.toLowerCase().replace('#', '')}%`];
          break;
      }

      if (totalQuery) {
        const totalResult = await db.query(totalQuery, totalParams);
        const total = parseInt(totalResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        results.pagination = {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        };
      }
    }

    // Mettre en cache pour 5 minutes
    await cache.set(cacheKey, results, 300);

    res.json(results);
  })
);

/**
 * @route   GET /api/search/hashtags
 * @desc    Recherche spécifique de hashtags
 * @access  Private
 */
router.get('/hashtags',
  requireAuth,
  validateRequest(searchValidation.searchHashtags, 'query'),
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Clé de cache
    const cacheKey = `search_hashtags:${q}:${page}:${limit}`;
    
    // Essayer de récupérer depuis le cache
    let cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      return res.json(cachedResults);
    }

    const result = await db.query(
      `SELECT hashtag, posts_count, trend_score, last_used_at,
              -- Score de pertinence
              CASE 
                WHEN hashtag = $1 THEN 4
                WHEN hashtag ILIKE $2 THEN 3
                WHEN hashtag ILIKE $3 THEN 2
                ELSE 1
              END as relevance_score
       FROM trending_hashtags
       WHERE hashtag ILIKE $3
       ORDER BY relevance_score DESC, trend_score DESC, posts_count DESC
       LIMIT $4 OFFSET $5`,
      [
        q.toLowerCase().replace('#', ''),
        `${q.toLowerCase().replace('#', '')}%`,
        `%${q.toLowerCase().replace('#', '')}%`,
        limit,
        offset
      ]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM trending_hashtags
       WHERE hashtag ILIKE $1`,
      [`%${q.toLowerCase().replace('#', '')}%`]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const hashtags = result.rows.map(hashtag => ({
      hashtag: hashtag.hashtag,
      postsCount: hashtag.posts_count,
      trendScore: hashtag.trend_score,
      lastUsedAt: hashtag.last_used_at,
      relevanceScore: hashtag.relevance_score
    }));

    const response = {
      hashtags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    // Mettre en cache pour 10 minutes
    await cache.set(cacheKey, response, 600);

    res.json(response);
  })
);

/**
 * @route   GET /api/search/hashtags/:hashtag/posts
 * @desc    Obtenir les posts d'un hashtag spécifique
 * @access  Private
 */
router.get('/hashtags/:hashtag/posts',
  requireAuth,
  validateRequest(searchValidation.getHashtagPosts, 'query'),
  asyncHandler(async (req, res) => {
    const { hashtag } = req.params;
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Nettoyer le hashtag
    const cleanHashtag = hashtag.toLowerCase().replace('#', '');

    // Clé de cache
    const cacheKey = `hashtag_posts:${cleanHashtag}:${page}:${limit}:${sortBy}:${sortOrder}`;
    
    // Essayer de récupérer depuis le cache
    let cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      return res.json(cachedResults);
    }

    // Construire la clause ORDER BY
    let orderClause = '';
    switch (sortBy) {
      case 'likes_count':
        orderClause = `p.likes_count ${sortOrder.toUpperCase()}`;
        break;
      case 'comments_count':
        orderClause = `p.comments_count ${sortOrder.toUpperCase()}`;
        break;
      case 'created_at':
      default:
        orderClause = `p.created_at ${sortOrder.toUpperCase()}`;
        break;
    }

    const result = await db.query(
      `SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
              p.hashtags, p.likes_count, p.comments_count, p.created_at,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $1
       WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
         AND $2 = ANY(p.hashtags)
         AND (
           NOT u.is_private OR 
           p.user_id = $1 OR
           p.user_id IN (
             SELECT following_id FROM follows 
             WHERE follower_id = $1 AND status = 'accepted'
           )
         )
       ORDER BY ${orderClause}
       LIMIT $3 OFFSET $4`,
      [userId, cleanHashtag, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
         AND $1 = ANY(p.hashtags)
         AND (
           NOT u.is_private OR 
           p.user_id = $2 OR
           p.user_id IN (
             SELECT following_id FROM follows 
             WHERE follower_id = $2 AND status = 'accepted'
           )
         )`,
      [cleanHashtag, userId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const posts = result.rows.map(post => ({
      id: post.id,
      user: {
        id: post.user_id,
        username: post.username,
        fullName: post.full_name,
        avatarUrl: post.avatar_url,
        isVerified: post.is_verified
      },
      caption: post.caption,
      mediaUrls: post.media_urls,
      mediaType: post.media_type,
      location: post.location,
      hashtags: post.hashtags || [],
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      isLiked: post.is_liked,
      createdAt: post.created_at
    }));

    const response = {
      hashtag: cleanHashtag,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    // Mettre en cache pour 5 minutes
    await cache.set(cacheKey, response, 300);

    res.json(response);
  })
);

/**
 * @route   GET /api/search/trending
 * @desc    Obtenir les hashtags tendances
 * @access  Private
 */
router.get('/trending',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    // Clé de cache
    const cacheKey = `trending_hashtags:${limit}`;
    
    // Essayer de récupérer depuis le cache
    let cachedTrending = await cache.get(cacheKey);
    if (cachedTrending) {
      return res.json(cachedTrending);
    }

    // Récupérer les hashtags tendances
    const result = await db.query(
      `SELECT hashtag, posts_count, trend_score, last_used_at
       FROM trending_hashtags
       WHERE last_used_at > NOW() - INTERVAL '7 days'
       ORDER BY trend_score DESC, posts_count DESC, last_used_at DESC
       LIMIT $1`,
      [limit]
    );

    const trending = result.rows.map(hashtag => ({
      hashtag: hashtag.hashtag,
      postsCount: hashtag.posts_count,
      trendScore: hashtag.trend_score,
      lastUsedAt: hashtag.last_used_at
    }));

    const response = {
      trending
    };

    // Mettre en cache pour 30 minutes
    await cache.set(cacheKey, response, 1800);

    res.json(response);
  })
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Obtenir des suggestions de recherche
 * @access  Private
 */
router.get('/suggestions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.length < 2) {
      return res.json({
        suggestions: {
          users: [],
          hashtags: []
        }
      });
    }

    // Clé de cache
    const cacheKey = `search_suggestions:${q}:${userId}`;
    
    // Essayer de récupérer depuis le cache
    let cachedSuggestions = await cache.get(cacheKey);
    if (cachedSuggestions) {
      return res.json(cachedSuggestions);
    }

    // Suggestions d'utilisateurs (top 5)
    const usersResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE 
                WHEN f.id IS NOT NULL THEN true 
                ELSE false 
              END as is_following
       FROM users u
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $1 AND f.status = 'accepted'
       WHERE u.is_active = true 
         AND u.id != $1
         AND (u.username ILIKE $2 OR u.full_name ILIKE $2)
       ORDER BY 
         CASE WHEN u.username ILIKE $3 THEN 1 ELSE 2 END,
         u.followers_count DESC
       LIMIT 5`,
      [userId, `%${q}%`, `${q}%`]
    );

    // Suggestions de hashtags (top 5)
    const hashtagsResult = await db.query(
      `SELECT hashtag, posts_count
       FROM trending_hashtags
       WHERE hashtag ILIKE $1
       ORDER BY 
         CASE WHEN hashtag ILIKE $2 THEN 1 ELSE 2 END,
         trend_score DESC
       LIMIT 5`,
      [`%${q.toLowerCase().replace('#', '')}%`, `${q.toLowerCase().replace('#', '')}%`]
    );

    const suggestions = {
      users: usersResult.rows.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        isFollowing: user.is_following
      })),
      hashtags: hashtagsResult.rows.map(hashtag => ({
        hashtag: hashtag.hashtag,
        postsCount: hashtag.posts_count
      }))
    };

    const response = { suggestions };

    // Mettre en cache pour 2 minutes
    await cache.set(cacheKey, response, 120);

    res.json(response);
  })
);

module.exports = router;