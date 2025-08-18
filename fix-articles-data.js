/**
 * Fix Articles Data Script
 * Sửa lỗi field names trong articles collection
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

// Fix articles data
const fixArticlesData = async () => {
  try {
    console.log('🔧 Bắt đầu fix articles data...\n');

    const articlesCollection = mongoose.connection.db.collection('articles');
    
    // 1. Kiểm tra current state
    const totalArticles = await articlesCollection.countDocuments();
    console.log(`📊 Tổng số articles: ${totalArticles}`);

    // 2. Kiểm tra articles có categoryId/authorId
    const articlesWithCategoryId = await articlesCollection.countDocuments({ categoryId: { $exists: true } });
    const articlesWithAuthorId = await articlesCollection.countDocuments({ authorId: { $exists: true } });
    
    console.log(`🔍 Articles có categoryId: ${articlesWithCategoryId}`);
    console.log(`🔍 Articles có authorId: ${articlesWithAuthorId}`);

    // 3. Lấy sample để xem structure
    const sampleArticle = await articlesCollection.findOne({});
    console.log('\n📄 Sample article structure:');
    console.log('Fields:', Object.keys(sampleArticle));
    
    if (sampleArticle.categoryId) {
      console.log(`categoryId: ${sampleArticle.categoryId}`);
    }
    if (sampleArticle.authorId) {
      console.log(`authorId: ${sampleArticle.authorId}`);
    }

    // 4. Lấy categories và users để mapping
    const categoriesCollection = mongoose.connection.db.collection('categories');
    const usersCollection = mongoose.connection.db.collection('users');
    
    const categories = await categoriesCollection.find({}).toArray();
    const users = await usersCollection.find({}).toArray();
    
    console.log(`\n📋 Available categories: ${categories.length}`);
    console.log(`👥 Available users: ${users.length}`);

    if (categories.length === 0) {
      console.log('⚠️ Không có categories! Cần seed categories trước.');
      return;
    }

    if (users.length === 0) {
      console.log('⚠️ Không có users! Cần seed users trước.');
      return;
    }

    // 5. Fix articles data
    console.log('\n🔧 Bắt đầu fix articles...');
    
    const articlesToFix = await articlesCollection.find({}).toArray();
    let fixedCount = 0;

    for (const article of articlesToFix) {
      const updateFields = {};
      let needsUpdate = false;

      // Fix categories field
      if (article.categoryId && !article.categories) {
        // Convert categoryId to categories array
        updateFields.categories = [article.categoryId];
        updateFields.$unset = { categoryId: "" };
        needsUpdate = true;
      } else if (!article.categories) {
        // Assign random category if no categories
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        updateFields.categories = [randomCategory._id];
        needsUpdate = true;
      }

      // Fix author field
      if (article.authorId && !article.author) {
        // Convert authorId to author
        updateFields.author = article.authorId;
        if (!updateFields.$unset) updateFields.$unset = {};
        updateFields.$unset.authorId = "";
        needsUpdate = true;
      } else if (!article.author) {
        // Assign random user if no author
        const randomUser = users[Math.floor(Math.random() * users.length)];
        updateFields.author = randomUser._id;
        needsUpdate = true;
      }

      // Update article if needed
      if (needsUpdate) {
        const { $unset, ...setFields } = updateFields;
        const updateQuery = { $set: setFields };
        if ($unset) {
          updateQuery.$unset = $unset;
        }

        await articlesCollection.updateOne(
          { _id: article._id },
          updateQuery
        );
        fixedCount++;
      }
    }

    console.log(`✅ Đã fix ${fixedCount} articles`);

    // 6. Verify fix
    console.log('\n🔍 Verify sau khi fix:');
    const articlesWithCategories = await articlesCollection.countDocuments({ categories: { $exists: true, $ne: [] } });
    const articlesWithAuthor = await articlesCollection.countDocuments({ author: { $exists: true } });
    
    console.log(`✅ Articles có categories: ${articlesWithCategories}`);
    console.log(`✅ Articles có author: ${articlesWithAuthor}`);

    // 7. Check published articles
    const publishedArticles = await articlesCollection.countDocuments({ status: 'published' });
    console.log(`📰 Published articles: ${publishedArticles}`);

    // 8. Sample fixed article
    const fixedSample = await articlesCollection.findOne({ status: 'published' });
    if (fixedSample) {
      console.log('\n📄 Sample fixed article:');
      console.log(`Title: ${fixedSample.title}`);
      console.log(`Status: ${fixedSample.status}`);
      console.log(`Categories: ${fixedSample.categories ? fixedSample.categories.length : 0}`);
      console.log(`Author: ${fixedSample.author ? 'Yes' : 'No'}`);
      console.log(`Published: ${fixedSample.publishedAt ? 'Yes' : 'No'}`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi fix articles data:', error);
  }
};

// Chạy script
const runFix = async () => {
  await connectDB();
  await fixArticlesData();
  await mongoose.disconnect();
  console.log('\n🔚 Hoàn thành fix articles data');
  process.exit(0);
};

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
  runFix().catch(console.error);
}

module.exports = { fixArticlesData };
