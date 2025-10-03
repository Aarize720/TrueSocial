-- TrueSocial Database Schema
-- PostgreSQL 15+ avec optimisations pour performance

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    website VARCHAR(255),
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- OAuth fields
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    
    -- Compteurs dénormalisés pour performance
    posts_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    media_urls JSONB NOT NULL, -- Array d'URLs des médias
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'carousel')),
    location VARCHAR(255),
    
    -- Hashtags et mentions extraits
    hashtags TEXT[], -- Array des hashtags
    mentions UUID[], -- Array des user_ids mentionnés
    
    -- Compteurs dénormalisés
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    
    -- Visibilité et modération
    is_archived BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des stories
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_url VARCHAR(500) NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    text_overlay TEXT,
    background_color VARCHAR(7), -- Hex color
    
    -- Compteurs
    views_count INTEGER DEFAULT 0,
    
    -- Expiration automatique (24h)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des vues de stories
CREATE TABLE story_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(story_id, viewer_id)
);

-- Table des likes
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, post_id)
);

-- Table des commentaires
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- Pour les réponses
    content TEXT NOT NULL,
    
    -- Compteurs
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    
    -- Modération
    is_hidden BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des likes de commentaires
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, comment_id)
);

-- Table des relations followers/following
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Table des notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'like', 'comment', 'follow', 'follow_request', 
        'mention', 'story_view', 'post_share'
    )),
    
    -- Références aux entités liées
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    
    -- Contenu de la notification
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB, -- Données additionnelles
    
    -- État
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE, -- Pour push notifications
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Table des hashtags populaires (cache)
CREATE TABLE trending_hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hashtag VARCHAR(100) NOT NULL UNIQUE,
    posts_count INTEGER DEFAULT 0,
    trend_score DECIMAL(10,2) DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sessions utilisateur
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des signalements
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEX POUR OPTIMISATION DES PERFORMANCES
-- ============================================================================

-- Index pour les utilisateurs
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- Index pour les posts (critiques pour le feed)
CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_user_created ON posts (user_id, created_at DESC);
CREATE INDEX idx_posts_hashtags ON posts USING gin (hashtags);
CREATE INDEX idx_posts_mentions ON posts USING gin (mentions);
CREATE INDEX idx_posts_is_archived ON posts (is_archived) WHERE is_archived = FALSE;

-- Index pour les stories
CREATE INDEX idx_stories_user_id ON stories (user_id);
CREATE INDEX idx_stories_expires_at ON stories (expires_at);
CREATE INDEX idx_stories_created_at ON stories (created_at DESC);

-- Index pour les likes (optimisation des compteurs)
CREATE INDEX idx_likes_post_id ON likes (post_id);
CREATE INDEX idx_likes_user_id ON likes (user_id);
CREATE INDEX idx_likes_created_at ON likes (created_at DESC);

-- Index pour les commentaires
CREATE INDEX idx_comments_post_id ON comments (post_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
CREATE INDEX idx_comments_parent_id ON comments (parent_id);
CREATE INDEX idx_comments_created_at ON comments (created_at DESC);

-- Index pour les follows (critiques pour le feed)
CREATE INDEX idx_follows_follower_id ON follows (follower_id);
CREATE INDEX idx_follows_following_id ON follows (following_id);
CREATE INDEX idx_follows_status ON follows (status);
CREATE INDEX idx_follows_created_at ON follows (created_at DESC);

-- Index pour les notifications
CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_id, is_read, created_at DESC);

-- Index pour les sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions (expires_at);

-- ============================================================================
-- TRIGGERS POUR MAINTENIR LES COMPTEURS
-- ============================================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour maintenir les compteurs de likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_post_likes_count
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Fonction pour maintenir les compteurs de commentaires
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        -- Si c'est une réponse, incrémenter le compteur du commentaire parent
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE comments SET replies_count = replies_count - 1 WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_post_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Fonction pour maintenir les compteurs de followers
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
        UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
        UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Changement de statut
        IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
            UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
            UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
            UPDATE users SET followers_count = followers_count - 1 WHERE id = NEW.following_id;
            UPDATE users SET following_count = following_count - 1 WHERE id = NEW.follower_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_follow_counts
    AFTER INSERT OR UPDATE OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Fonction pour maintenir le compteur de posts
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_user_posts_count
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();

-- Fonction pour nettoyer les stories expirées
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
    DELETE FROM stories WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- ============================================================================
-- VUES POUR OPTIMISER LES REQUÊTES COMPLEXES
-- ============================================================================

-- Vue pour le feed utilisateur optimisé
CREATE VIEW user_feed AS
SELECT 
    p.*,
    u.username,
    u.full_name,
    u.avatar_url,
    u.is_verified,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) as is_liked_by_user
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.is_archived = FALSE 
    AND p.is_hidden = FALSE
    AND u.is_active = TRUE
    AND (
        p.user_id IN (
            SELECT following_id FROM follows 
            WHERE follower_id = $1 AND status = 'accepted'
        )
        OR p.user_id = $1
    )
ORDER BY p.created_at DESC;

-- Vue pour les posts populaires
CREATE VIEW trending_posts AS
SELECT 
    p.*,
    u.username,
    u.full_name,
    u.avatar_url,
    u.is_verified,
    (p.likes_count * 2 + p.comments_count * 3 + p.shares_count * 5) as engagement_score
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
    AND p.is_archived = FALSE 
    AND p.is_hidden = FALSE
    AND u.is_active = TRUE
ORDER BY engagement_score DESC, p.created_at DESC;

-- Vue pour les statistiques utilisateur
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.posts_count,
    u.followers_count,
    u.following_count,
    COUNT(DISTINCT l.id) as total_likes_received,
    COUNT(DISTINCT c.id) as total_comments_received,
    AVG(p.likes_count) as avg_likes_per_post,
    MAX(p.created_at) as last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.is_archived = FALSE
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.username, u.posts_count, u.followers_count, u.following_count;

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour extraire les hashtags d'un texte
CREATE OR REPLACE FUNCTION extract_hashtags(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    hashtags TEXT[];
BEGIN
    SELECT array_agg(DISTINCT lower(substring(match FROM 2)))
    INTO hashtags
    FROM regexp_split_to_table(text_content, '\s+') AS match
    WHERE match ~ '^#[a-zA-Z0-9_]+$';
    
    RETURN COALESCE(hashtags, ARRAY[]::TEXT[]);
END;
$$ language 'plpgsql';

-- Fonction pour extraire les mentions d'un texte
CREATE OR REPLACE FUNCTION extract_mentions(text_content TEXT)
RETURNS UUID[] AS $$
DECLARE
    mentions UUID[];
BEGIN
    SELECT array_agg(DISTINCT u.id)
    INTO mentions
    FROM regexp_split_to_table(text_content, '\s+') AS match
    JOIN users u ON lower(u.username) = lower(substring(match FROM 2))
    WHERE match ~ '^@[a-zA-Z0-9_]+$';
    
    RETURN COALESCE(mentions, ARRAY[]::UUID[]);
END;
$$ language 'plpgsql';

-- Fonction pour calculer la distance entre deux utilisateurs (degrés de séparation)
CREATE OR REPLACE FUNCTION user_connection_degree(user1_id UUID, user2_id UUID)
RETURNS INTEGER AS $$
DECLARE
    degree INTEGER := 0;
    found BOOLEAN := FALSE;
    current_users UUID[];
    next_users UUID[];
    visited_users UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Si c'est le même utilisateur
    IF user1_id = user2_id THEN
        RETURN 0;
    END IF;
    
    -- Si ils se suivent directement
    IF EXISTS(SELECT 1 FROM follows WHERE follower_id = user1_id AND following_id = user2_id AND status = 'accepted') THEN
        RETURN 1;
    END IF;
    
    current_users := ARRAY[user1_id];
    visited_users := visited_users || user1_id;
    
    -- Recherche en largeur jusqu'à 6 degrés
    WHILE degree < 6 AND NOT found AND array_length(current_users, 1) > 0 LOOP
        degree := degree + 1;
        next_users := ARRAY[]::UUID[];
        
        -- Pour chaque utilisateur du niveau actuel
        FOR i IN 1..array_length(current_users, 1) LOOP
            -- Trouver tous les utilisateurs qu'il suit
            SELECT array_agg(following_id)
            INTO next_users
            FROM (
                SELECT DISTINCT following_id
                FROM follows
                WHERE follower_id = current_users[i] 
                    AND status = 'accepted'
                    AND following_id != ALL(visited_users)
                UNION
                SELECT DISTINCT follower_id
                FROM follows
                WHERE following_id = current_users[i] 
                    AND status = 'accepted'
                    AND follower_id != ALL(visited_users)
            ) AS connections;
            
            -- Vérifier si on a trouvé l'utilisateur cible
            IF user2_id = ANY(next_users) THEN
                found := TRUE;
                EXIT;
            END IF;
        END LOOP;
        
        visited_users := visited_users || current_users;
        current_users := next_users;
    END LOOP;
    
    IF found THEN
        RETURN degree;
    ELSE
        RETURN -1; -- Pas de connexion trouvée
    END IF;
END;
$$ language 'plpgsql';

-- ============================================================================
-- DONNÉES INITIALES ET CONFIGURATION
-- ============================================================================

-- Insérer quelques hashtags populaires par défaut
INSERT INTO trending_hashtags (hashtag, posts_count, trend_score) VALUES
('#photography', 0, 0),
('#travel', 0, 0),
('#food', 0, 0),
('#fashion', 0, 0),
('#art', 0, 0),
('#nature', 0, 0),
('#fitness', 0, 0),
('#music', 0, 0),
('#technology', 0, 0),
('#lifestyle', 0, 0);

-- Configuration des paramètres PostgreSQL pour optimisation
-- (À exécuter en tant que superuser si nécessaire)
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- ALTER SYSTEM SET track_activity_query_size = 2048;
-- ALTER SYSTEM SET pg_stat_statements.track = 'all';

COMMIT;