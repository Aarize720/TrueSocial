-- Script de configuration de la base de données TrueSocial
-- Exécutez ce script avec: psql -U postgres -f setup-database.sql

-- Créer l'utilisateur truesocial (ignorer l'erreur si existe déjà)
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'truesocial') THEN
      CREATE USER truesocial WITH PASSWORD 'truesocial123';
      RAISE NOTICE 'Utilisateur truesocial créé';
   ELSE
      RAISE NOTICE 'Utilisateur truesocial existe déjà';
   END IF;
END
$$;

-- Créer la base de données (ignorer l'erreur si existe déjà)
SELECT 'CREATE DATABASE truesocial OWNER truesocial'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'truesocial')\gexec

-- Se connecter à la base de données truesocial
\c truesocial

-- Attribuer tous les privilèges
GRANT ALL PRIVILEGES ON DATABASE truesocial TO truesocial;
GRANT ALL ON SCHEMA public TO truesocial;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO truesocial;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO truesocial;

-- Afficher un message de succès
\echo ''
\echo '========================================='
\echo 'Configuration terminée avec succès!'
\echo '========================================='
\echo ''
\echo 'Informations de connexion:'
\echo '  Base de données: truesocial'
\echo '  Utilisateur: truesocial'
\echo '  Mot de passe: truesocial123'
\echo '  Host: localhost'
\echo '  Port: 5432'
\echo ''
\echo 'Prochaines étapes:'
\echo '  1. npm run prisma:generate'
\echo '  2. npm run prisma:migrate'
\echo '  3. npm run db:seed (optionnel)'
\echo '  4. npm run dev'
\echo ''