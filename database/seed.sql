-- TrueSocial - Données de test pour développement
-- Ce fichier contient des données de démonstration

-- Insérer des utilisateurs de test
INSERT INTO users (id, username, email, password_hash, full_name, bio, avatar_url, is_verified, posts_count, followers_count, following_count) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'johndoe',
    'john@example.com',
    '$2b$10$rQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQx', -- password: "password123"
    'John Doe',
    'Photographer & Travel Enthusiast 📸✈️\nLiving life one adventure at a time',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    true,
    12,
    1250,
    890
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'janedoe',
    'jane@example.com',
    '$2b$10$rQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQx',
    'Jane Doe',
    'Food blogger & Chef 👩‍🍳\nSharing delicious recipes daily',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    true,
    45,
    3200,
    1100
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'mikejohnson',
    'mike@example.com',
    '$2b$10$rQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQx',
    'Mike Johnson',
    'Fitness coach & Motivational speaker 💪\nTransforming lives through fitness',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    false,
    28,
    850,
    420
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'sarahwilson',
    'sarah@example.com',
    '$2b$10$rQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQx',
    'Sarah Wilson',
    'Digital artist & UI/UX Designer 🎨\nCreating beautiful digital experiences',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    true,
    67,
    2100,
    780
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'alexchen',
    'alex@example.com',
    '$2b$10$rQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQxwjhGl.5J5J5eKQZ8kHWfQx',
    'Alex Chen',
    'Tech entrepreneur & Developer 💻\nBuilding the future, one app at a time',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    false,
    23,
    1800,
    950
);

-- Insérer des relations de suivi
INSERT INTO follows (follower_id, following_id, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'accepted'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'accepted'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'accepted'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'accepted'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'accepted'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'accepted'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'accepted'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'accepted'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'accepted'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'accepted'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'accepted'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'accepted');

-- Insérer des posts de test
INSERT INTO posts (id, user_id, caption, media_urls, media_type, hashtags, likes_count, comments_count) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Amazing sunset from my latest adventure! 🌅 The colors were absolutely breathtaking. Nature never fails to amaze me. #photography #sunset #travel #nature',
    '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['photography', 'sunset', 'travel', 'nature'],
    127,
    23
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Homemade pasta with fresh basil and tomatoes 🍝 Recipe coming soon on my blog! #food #cooking #pasta #homemade #italian',
    '["https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['food', 'cooking', 'pasta', 'homemade', 'italian'],
    89,
    15
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'Morning workout complete! 💪 Remember, consistency is key. Every day is a chance to get stronger. #fitness #motivation #workout #health #lifestyle',
    '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['fitness', 'motivation', 'workout', 'health', 'lifestyle'],
    156,
    31
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    'New UI design for a mobile banking app 📱 Clean, modern, and user-friendly. What do you think? #design #ui #ux #mobile #app #banking',
    '["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['design', 'ui', 'ux', 'mobile', 'app', 'banking'],
    203,
    42
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440005',
    'Late night coding session 👨‍💻 Working on something exciting! Can''t wait to share it with you all. #coding #developer #startup #technology #innovation',
    '["https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['coding', 'developer', 'startup', 'technology', 'innovation'],
    78,
    19
),
(
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'Mountain hiking adventure! 🏔️ The view from the top was worth every step. #hiking #mountains #adventure #nature #photography',
    '["https://images.unsplash.com/photo-1464822759844-d150baec0494?w=800&h=800&fit=crop", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop"]',
    'carousel',
    ARRAY['hiking', 'mountains', 'adventure', 'nature', 'photography'],
    234,
    56
),
(
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440002',
    'Fresh croissants from this morning''s baking session 🥐 The smell of fresh bread is unbeatable! #baking #croissants #fresh #morning #bakery',
    '["https://images.unsplash.com/photo-1555507036-ab794f4afe5b?w=800&h=800&fit=crop"]',
    'image',
    ARRAY['baking', 'croissants', 'fresh', 'morning', 'bakery'],
    145,
    28
);

-- Insérer des likes
INSERT INTO likes (user_id, post_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005'),
('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005');

-- Insérer des commentaires
INSERT INTO comments (id, user_id, post_id, content, likes_count) VALUES
(
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    'Absolutely stunning! Where was this taken? 😍',
    5
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440001',
    'Amazing colors! Great shot 📸',
    3
),
(
    '770e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    'This looks delicious! Can you share the recipe? 🤤',
    8
),
(
    '770e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440002',
    'I need to try making this! Thanks for the inspiration 🍝',
    2
),
(
    '770e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003',
    'You''re such an inspiration! Keep it up! 💪',
    12
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440004',
    'Love the clean design! Very modern and professional 👌',
    7
),
(
    '770e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440005',
    'Can''t wait to see what you''re building! 🚀',
    4
);

-- Insérer des réponses aux commentaires
INSERT INTO comments (id, user_id, post_id, parent_id, content, likes_count) VALUES
(
    '770e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    'Thanks! This was taken in Santorini, Greece 🇬🇷',
    2
),
(
    '770e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440003',
    'Of course! I''ll post it on my blog tomorrow 😊',
    1
);

-- Insérer des stories de test
INSERT INTO stories (id, user_id, media_url, media_type, text_overlay, views_count) VALUES
(
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
    'image',
    'Good morning! ☀️',
    45
),
(
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=700&fit=crop',
    'image',
    'Cooking something special today! 👨‍🍳',
    32
),
(
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=700&fit=crop',
    'image',
    'Gym time! 💪',
    28
);

-- Insérer des vues de stories
INSERT INTO story_views (story_id, viewer_id) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002');

-- Insérer des notifications de test
INSERT INTO notifications (id, recipient_id, sender_id, type, post_id, title, message, is_read) VALUES
(
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'like',
    '660e8400-e29b-41d4-a716-446655440001',
    'New like',
    'janedoe liked your photo',
    false
),
(
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440003',
    'comment',
    '660e8400-e29b-41d4-a716-446655440001',
    'New comment',
    'mikejohnson commented on your photo',
    false
),
(
    '990e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440005',
    'follow',
    null,
    'New follower',
    'alexchen started following you',
    true
);

-- Mettre à jour les hashtags tendances avec les données des posts
UPDATE trending_hashtags SET 
    posts_count = (
        SELECT COUNT(*) 
        FROM posts 
        WHERE hashtag = ANY(hashtags)
    ),
    trend_score = (
        SELECT COALESCE(SUM(likes_count + comments_count), 0) 
        FROM posts 
        WHERE hashtag = ANY(hashtags)
    ),
    last_used_at = NOW()
WHERE hashtag IN ('photography', 'food', 'fitness', 'design', 'technology');

-- Ajouter quelques hashtags supplémentaires basés sur les posts
INSERT INTO trending_hashtags (hashtag, posts_count, trend_score, last_used_at) VALUES
('sunset', 1, 150, NOW()),
('travel', 2, 361, NOW()),
('nature', 2, 361, NOW()),
('cooking', 2, 234, NOW()),
('pasta', 1, 104, NOW()),
('motivation', 1, 187, NOW()),
('workout', 1, 187, NOW()),
('ui', 1, 245, NOW()),
('ux', 1, 245, NOW()),
('coding', 1, 97, NOW()),
('developer', 1, 97, NOW()),
('hiking', 1, 290, NOW()),
('mountains', 1, 290, NOW()),
('baking', 1, 173, NOW())
ON CONFLICT (hashtag) DO UPDATE SET
    posts_count = EXCLUDED.posts_count,
    trend_score = EXCLUDED.trend_score,
    last_used_at = EXCLUDED.last_used_at;

COMMIT;