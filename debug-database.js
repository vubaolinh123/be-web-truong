/**
 * Database Debug Script
 * Kiểm tra articles trong MongoDB
 */

const mongoose = require('mongoose');

// Kết nối database
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/university');
    console.log('🔗 Kết nối MongoDB thành công');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

// Debug function
const debugDatabase = async () => {
  try {
    console.log('🔍 Bắt đầu debug database...\n');

    // 1. Kiểm tra tất cả collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Danh sách collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log('');

    // 2. Kiểm tra collection articles
    const articlesCollection = mongoose.connection.db.collection('articles');
    const articleCount = await articlesCollection.countDocuments();
    console.log(`📊 Số lượng documents trong collection 'articles': ${articleCount}`);

    if (articleCount > 0) {
      // 3. Lấy một vài sample articles
      const sampleArticles = await articlesCollection.find({}).limit(3).toArray();
      console.log('\n📄 Sample articles:');
      sampleArticles.forEach((article, index) => {
        console.log(`\n${index + 1}. ${article.title}`);
        console.log(`   - ID: ${article._id}`);
        console.log(`   - Status: ${article.status}`);
        console.log(`   - Featured: ${article.featured}`);
        console.log(`   - Created: ${article.createdAt}`);
        console.log(`   - Published: ${article.publishedAt}`);
      });

      // 4. Kiểm tra status distribution
      const statusStats = await articlesCollection.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log('\n📈 Phân bố theo status:');
      statusStats.forEach(stat => {
        console.log(`  - ${stat._id}: ${stat.count} articles`);
      });

      // 5. Kiểm tra published articles
      const publishedCount = await articlesCollection.countDocuments({ status: 'published' });
      console.log(`\n✅ Số articles có status 'published': ${publishedCount}`);

      // 6. Kiểm tra articles có publishedAt
      const withPublishedAt = await articlesCollection.countDocuments({ 
        publishedAt: { $ne: null } 
      });
      console.log(`📅 Số articles có publishedAt: ${withPublishedAt}`);

    } else {
      console.log('⚠️ Không có articles nào trong database!');
    }

    // 7. Kiểm tra các collections khác
    const categoriesCount = await mongoose.connection.db.collection('categories').countDocuments();
    const usersCount = await mongoose.connection.db.collection('users').countDocuments();
    
    console.log(`\n📊 Thống kê collections khác:`);
    console.log(`  - Categories: ${categoriesCount}`);
    console.log(`  - Users: ${usersCount}`);

  } catch (error) {
    console.error('❌ Lỗi khi debug database:', error);
  }
};

// Chạy script
const runDebug = async () => {
  await connectDB();
  await debugDatabase();
  await mongoose.disconnect();
  console.log('\n🔚 Hoàn thành debug database');
  process.exit(0);
};

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
  runDebug().catch(console.error);
}

module.exports = { debugDatabase };
