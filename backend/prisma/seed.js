/**
 * Script de seed pour la base de données
 * Crée des données de test pour le développement
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Nettoyer la base de données (optionnel)
  console.log('🧹 Nettoyage de la base de données...');
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.storyView.deleteMany();
  await prisma.story.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.trendingHashtag.deleteMany();
  await prisma.user.deleteMany();

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Créer des utilisateurs
  console.log('👤 Création des utilisateurs...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: hashedPassword,
        fullName: 'John Doe',
        bio: 'Photographer & Travel Enthusiast 📸✈️',
        avatarUrl: 'https://i.pravatar.cc/300?img=1',
        isVerified: true,
        isPrivate: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        username: 'janesmith',
        password: hashedPassword,
        fullName: 'Jane Smith',
        bio: 'Digital Artist | Coffee Lover ☕🎨',
        avatarUrl: 'https://i.pravatar.cc/300?img=5',
        isVerified: true,
        isPrivate: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike.wilson@example.com',
        username: 'mikewilson',
        password: hashedPassword,
        fullName: 'Mike Wilson',
        bio: 'Fitness Coach | Healthy Living 💪🥗',
        avatarUrl: 'https://i.pravatar.cc/300?img=12',
        isVerified: false,
        isPrivate: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah.jones@example.com',
        username: 'sarahjones',
        password: hashedPassword,
        fullName: 'Sarah Jones',
        bio: 'Fashion Blogger | Style Icon 👗✨',
        avatarUrl: 'https://i.pravatar.cc/300?img=9',
        isVerified: true,
        isPrivate: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'alex.brown@example.com',
        username: 'alexbrown',
        password: hashedPassword,
        fullName: 'Alex Brown',
        bio: 'Tech Enthusiast | Gamer 🎮💻',
        avatarUrl: 'https://i.pravatar.cc/300?img=15',
        isVerified: false,
        isPrivate: false,
      },
    }),
  ]);

  console.log(`✅ ${users.length} utilisateurs créés`);

  // Créer des relations de suivi
  console.log('🔗 Création des relations de suivi...');
  await Promise.all([
    // John suit Jane, Mike et Alex
    prisma.follow.create({
      data: { followerId: users[0].id, followingId: users[1].id, status: 'accepted' },
    }),
    prisma.follow.create({
      data: { followerId: users[0].id, followingId: users[2].id, status: 'accepted' },
    }),
    prisma.follow.create({
      data: { followerId: users[0].id, followingId: users[4].id, status: 'accepted' },
    }),
    // Jane suit John et Sarah
    prisma.follow.create({
      data: { followerId: users[1].id, followingId: users[0].id, status: 'accepted' },
    }),
    prisma.follow.create({
      data: { followerId: users[1].id, followingId: users[3].id, status: 'accepted' },
    }),
    // Mike suit tout le monde
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[0].id, status: 'accepted' },
    }),
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[1].id, status: 'accepted' },
    }),
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[3].id, status: 'pending' },
    }),
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[4].id, status: 'accepted' },
    }),
  ]);

  console.log('✅ Relations de suivi créées');

  // Créer des posts
  console.log('📝 Création des posts...');
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        userId: users[0].id,
        caption: 'Beautiful sunset at the beach 🌅 #sunset #beach #photography',
        mediaUrls: ['https://picsum.photos/800/800?random=1'],
        mediaType: 'image',
        location: 'Malibu Beach, CA',
        hashtags: ['sunset', 'beach', 'photography'],
      },
    }),
    prisma.post.create({
      data: {
        userId: users[0].id,
        caption: 'Mountain hiking adventure! 🏔️ #hiking #nature #adventure',
        mediaUrls: ['https://picsum.photos/800/800?random=2'],
        mediaType: 'image',
        location: 'Rocky Mountains',
        hashtags: ['hiking', 'nature', 'adventure'],
      },
    }),
    prisma.post.create({
      data: {
        userId: users[1].id,
        caption: 'New digital art piece 🎨 What do you think? #digitalart #art #creative',
        mediaUrls: ['https://picsum.photos/800/800?random=3'],
        mediaType: 'image',
        hashtags: ['digitalart', 'art', 'creative'],
      },
    }),
    prisma.post.create({
      data: {
        userId: users[2].id,
        caption: 'Morning workout routine 💪 #fitness #workout #health',
        mediaUrls: ['https://picsum.photos/800/800?random=4'],
        mediaType: 'image',
        location: 'Gold\'s Gym',
        hashtags: ['fitness', 'workout', 'health'],
      },
    }),
    prisma.post.create({
      data: {
        userId: users[4].id,
        caption: 'Gaming setup complete! 🎮 #gaming #setup #tech',
        mediaUrls: ['https://picsum.photos/800/800?random=5'],
        mediaType: 'image',
        hashtags: ['gaming', 'setup', 'tech'],
      },
    }),
  ]);

  console.log(`✅ ${posts.length} posts créés`);

  // Créer des likes
  console.log('❤️ Création des likes...');
  await Promise.all([
    prisma.like.create({ data: { postId: posts[0].id, userId: users[1].id } }),
    prisma.like.create({ data: { postId: posts[0].id, userId: users[2].id } }),
    prisma.like.create({ data: { postId: posts[1].id, userId: users[1].id } }),
    prisma.like.create({ data: { postId: posts[2].id, userId: users[0].id } }),
    prisma.like.create({ data: { postId: posts[2].id, userId: users[2].id } }),
    prisma.like.create({ data: { postId: posts[3].id, userId: users[0].id } }),
    prisma.like.create({ data: { postId: posts[4].id, userId: users[0].id } }),
    prisma.like.create({ data: { postId: posts[4].id, userId: users[2].id } }),
  ]);

  // Mettre à jour les compteurs de likes
  for (const post of posts) {
    const likesCount = await prisma.like.count({ where: { postId: post.id } });
    await prisma.post.update({
      where: { id: post.id },
      data: { likesCount },
    });
  }

  console.log('✅ Likes créés');

  // Créer des commentaires
  console.log('💬 Création des commentaires...');
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        postId: posts[0].id,
        userId: users[1].id,
        content: 'Absolutely stunning! 😍',
      },
    }),
    prisma.comment.create({
      data: {
        postId: posts[0].id,
        userId: users[2].id,
        content: 'Great shot! Where is this?',
      },
    }),
    prisma.comment.create({
      data: {
        postId: posts[2].id,
        userId: users[0].id,
        content: 'Love your art style! 🎨',
      },
    }),
  ]);

  // Mettre à jour les compteurs de commentaires
  for (const post of posts) {
    const commentsCount = await prisma.comment.count({ where: { postId: post.id } });
    await prisma.post.update({
      where: { id: post.id },
      data: { commentsCount },
    });
  }

  console.log(`✅ ${comments.length} commentaires créés`);

  // Créer des hashtags tendances
  console.log('🔥 Création des hashtags tendances...');
  await Promise.all([
    prisma.trendingHashtag.create({
      data: { hashtag: 'photography', postsCount: 150, trendScore: 95.5 },
    }),
    prisma.trendingHashtag.create({
      data: { hashtag: 'travel', postsCount: 120, trendScore: 88.3 },
    }),
    prisma.trendingHashtag.create({
      data: { hashtag: 'fitness', postsCount: 100, trendScore: 82.1 },
    }),
    prisma.trendingHashtag.create({
      data: { hashtag: 'art', postsCount: 95, trendScore: 79.8 },
    }),
    prisma.trendingHashtag.create({
      data: { hashtag: 'food', postsCount: 85, trendScore: 75.2 },
    }),
  ]);

  console.log('✅ Hashtags tendances créés');

  // Créer des stories
  console.log('📖 Création des stories...');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 heures

  await Promise.all([
    prisma.story.create({
      data: {
        userId: users[0].id,
        mediaUrl: 'https://picsum.photos/1080/1920?random=10',
        mediaType: 'image',
        duration: 5,
        expiresAt,
      },
    }),
    prisma.story.create({
      data: {
        userId: users[1].id,
        mediaUrl: 'https://picsum.photos/1080/1920?random=11',
        mediaType: 'image',
        duration: 5,
        expiresAt,
      },
    }),
  ]);

  console.log('✅ Stories créées');

  // Mettre à jour les compteurs des utilisateurs
  console.log('🔄 Mise à jour des compteurs...');
  for (const user of users) {
    const postsCount = await prisma.post.count({ where: { userId: user.id } });
    const followersCount = await prisma.follow.count({
      where: { followingId: user.id, status: 'accepted' },
    });
    const followingCount = await prisma.follow.count({
      where: { followerId: user.id, status: 'accepted' },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { postsCount, followersCount, followingCount },
    });
  }

  console.log('✅ Compteurs mis à jour');

  console.log('');
  console.log('🎉 Seeding terminé avec succès!');
  console.log('');
  console.log('📊 Résumé:');
  console.log(`   - ${users.length} utilisateurs`);
  console.log(`   - ${posts.length} posts`);
  console.log(`   - ${comments.length} commentaires`);
  console.log('   - 8 likes');
  console.log('   - 9 relations de suivi');
  console.log('   - 5 hashtags tendances');
  console.log('   - 2 stories');
  console.log('');
  console.log('🔑 Identifiants de test:');
  console.log('   Email: john.doe@example.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });