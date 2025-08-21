/**
 * Database Investigation Script
 * Analyzes the database to find suitable categories with multiple articles for testing
 */

import mongoose from 'mongoose';
import Article from './src/models/Article/index.js';
import Category from './src/models/Category/index.js';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to connect to MongoDB: ${error.message}`, 'red');
    return false;
  }
}

async function investigateDatabase() {
  log('🔍 Investigating Database Structure...', 'cyan');
  
  // Get all categories with article counts
  const categoriesWithCounts = await Category.aggregate([
    {
      $lookup: {
        from: 'articles',
        localField: '_id',
        foreignField: 'categories',
        as: 'articles'
      }
    },
    {
      $addFields: {
        totalArticles: { $size: '$articles' },
        publishedArticles: {
          $size: {
            $filter: {
              input: '$articles',
              cond: { $eq: ['$$this.status', 'published'] }
            }
          }
        }
      }
    },
    {
      $sort: { publishedArticles: -1 }
    }
  ]);
  
  log('\n📊 Categories with Article Counts:', 'bright');
  log('=' * 80, 'cyan');
  
  categoriesWithCounts.forEach((category, index) => {
    const color = category.publishedArticles >= 3 ? 'green' : 
                  category.publishedArticles >= 2 ? 'yellow' : 'red';
    log(`${index + 1}. ${category.name} (${category.slug})`, 'blue');
    log(`   ID: ${category._id}`, 'blue');
    log(`   Published Articles: ${category.publishedArticles}`, color);
    log(`   Total Articles: ${category.totalArticles}`, 'blue');
    log('');
  });
  
  // Find categories with multiple published articles
  const goodCategories = categoriesWithCounts.filter(cat => cat.publishedArticles >= 2);
  
  if (goodCategories.length > 0) {
    log('✅ Categories suitable for testing (2+ published articles):', 'green');
    goodCategories.slice(0, 5).forEach((category, index) => {
      log(`${index + 1}. ${category.name} - ${category.publishedArticles} articles (ID: ${category._id})`, 'green');
    });
    
    // Test with the best category
    const bestCategory = goodCategories[0];
    log(`\n🎯 Testing with best category: ${bestCategory.name}`, 'cyan');
    
    // Get sample articles from this category
    const sampleArticles = await Article.find({
      categories: bestCategory._id,
      status: 'published'
    }).limit(5).select('title slug _id');
    
    log('Sample articles in this category:', 'blue');
    sampleArticles.forEach((article, index) => {
      log(`  ${index + 1}. ${article.title} (ID: ${article._id})`, 'blue');
    });
    
    // Generate test URLs
    if (sampleArticles.length >= 2) {
      const excludeId = sampleArticles[0]._id;
      const categoryId = bestCategory._id;
      
      log('\n🔗 Test URLs:', 'magenta');
      log(`Without exclude: http://localhost:5001/api/articles/public/related/${categoryId}?limit=6&sortBy=publishedAt&sortOrder=desc`, 'magenta');
      log(`With exclude: http://localhost:5001/api/articles/public/related/${categoryId}?limit=6&sortBy=publishedAt&sortOrder=desc&excludeId=${excludeId}`, 'magenta');
      
      return {
        categoryId: categoryId.toString(),
        excludeId: excludeId.toString(),
        categoryName: bestCategory.name,
        expectedResults: bestCategory.publishedArticles
      };
    }
  } else {
    log('❌ No categories found with multiple published articles', 'red');
    log('💡 Suggestion: Create more articles or publish existing draft articles', 'yellow');
  }
  
  return null;
}

async function createTestArticles() {
  log('\n🏗️  Creating test articles for better testing...', 'cyan');
  
  try {
    // Find a category to use
    const category = await Category.findOne({ status: 'active' });
    if (!category) {
      log('❌ No active category found', 'red');
      return false;
    }
    
    // Create 3 test articles
    const testArticles = [
      {
        title: 'Test Article 1 - Related Articles Testing',
        slug: 'test-article-1-related-articles-testing',
        content: 'This is a test article created for testing the related articles API. It contains enough content to meet the minimum requirements for article creation and testing purposes.',
        excerpt: 'Test article for related articles API testing',
        categories: [category._id],
        status: 'published',
        publishedAt: new Date(),
        readingTime: 3,
        viewCount: 10,
        likeCount: 5,
        commentCount: 2
      },
      {
        title: 'Test Article 2 - API Testing Suite',
        slug: 'test-article-2-api-testing-suite',
        content: 'This is another test article created for comprehensive testing of the related articles functionality. It provides additional content for testing various API parameters.',
        excerpt: 'Second test article for comprehensive API testing',
        categories: [category._id],
        status: 'published',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        readingTime: 4,
        viewCount: 15,
        likeCount: 8,
        commentCount: 3
      },
      {
        title: 'Test Article 3 - Related Content Demo',
        slug: 'test-article-3-related-content-demo',
        content: 'This third test article completes our testing suite for the related articles API. It ensures we have sufficient content to test exclusion and sorting functionality.',
        excerpt: 'Third test article for related content demonstration',
        categories: [category._id],
        status: 'published',
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        readingTime: 5,
        viewCount: 20,
        likeCount: 12,
        commentCount: 5
      }
    ];
    
    // Check if test articles already exist
    const existingTestArticles = await Article.find({
      slug: { $in: testArticles.map(a => a.slug) }
    });
    
    if (existingTestArticles.length > 0) {
      log('⚠️  Test articles already exist, skipping creation', 'yellow');
      return true;
    }
    
    // Create the articles
    const createdArticles = await Article.insertMany(testArticles);
    log(`✅ Created ${createdArticles.length} test articles in category: ${category.name}`, 'green');
    
    return {
      categoryId: category._id.toString(),
      categoryName: category.name,
      articlesCreated: createdArticles.length
    };
    
  } catch (error) {
    log(`❌ Failed to create test articles: ${error.message}`, 'red');
    return false;
  }
}

async function runInvestigation() {
  log('🚀 Starting Database Investigation', 'bright');
  log('=' * 60, 'cyan');
  
  const connected = await connectToDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  const testData = await investigateDatabase();
  
  if (!testData) {
    log('\n💡 No suitable test data found. Creating test articles...', 'yellow');
    const created = await createTestArticles();
    
    if (created) {
      log('\n🔄 Re-running investigation after creating test data...', 'cyan');
      await investigateDatabase();
    }
  }
  
  await mongoose.connection.close();
  log('\n📝 Investigation complete. Database connection closed.', 'blue');
}

runInvestigation().catch(error => {
  log(`💥 Investigation failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
