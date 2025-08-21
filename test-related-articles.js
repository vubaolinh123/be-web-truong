/**
 * Comprehensive Related Articles API Testing Script
 * Tests the related articles API with various parameters and database verification
 */

import mongoose from 'mongoose';
import Article from './src/models/Article/index.js';
import Category from './src/models/Category/index.js';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';

// Test configuration - Updated with category that has multiple articles
const TEST_CONFIG = {
  categoryId: '68a2bcb92772977f41fcb87f', // Category with 3 published articles
  excludeId: '68a2d12361e3ae3eed811bde', // One of the articles to exclude
  limits: [3, 6, 10],
  sortOptions: [
    { sortBy: 'publishedAt', sortOrder: 'desc' },
    { sortBy: 'publishedAt', sortOrder: 'asc' },
    { sortBy: 'viewCount', sortOrder: 'desc' },
    { sortBy: 'createdAt', sortOrder: 'desc' }
  ]
};

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

// Connect to MongoDB
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

// Verify database data
async function verifyDatabaseData() {
  log('\n📊 Verifying Database Data...', 'cyan');
  
  try {
    // Check total articles
    const totalArticles = await Article.countDocuments();
    log(`Total articles in database: ${totalArticles}`, 'blue');
    
    // Check published articles
    const publishedArticles = await Article.countDocuments({ status: 'published' });
    log(`Published articles: ${publishedArticles}`, 'blue');
    
    // Check categories
    const totalCategories = await Category.countDocuments();
    log(`Total categories: ${totalCategories}`, 'blue');
    
    // Check specific category
    const targetCategory = await Category.findById(TEST_CONFIG.categoryId);
    if (targetCategory) {
      log(`✅ Target category found: ${targetCategory.name} (${targetCategory.slug})`, 'green');
    } else {
      log(`❌ Target category not found: ${TEST_CONFIG.categoryId}`, 'red');
      return false;
    }
    
    // Check articles in target category
    const articlesInCategory = await Article.countDocuments({
      status: 'published',
      categories: TEST_CONFIG.categoryId
    });
    log(`Published articles in target category: ${articlesInCategory}`, 'blue');
    
    if (articlesInCategory === 0) {
      log('❌ No published articles found in target category', 'red');
      
      // Find any articles in this category (any status)
      const anyArticlesInCategory = await Article.countDocuments({
        categories: TEST_CONFIG.categoryId
      });
      log(`Total articles (any status) in category: ${anyArticlesInCategory}`, 'yellow');
      
      // Show sample articles in this category
      const sampleArticles = await Article.find({
        categories: TEST_CONFIG.categoryId
      }).limit(5).select('title status categories');
      
      log('Sample articles in category:', 'yellow');
      sampleArticles.forEach(article => {
        log(`  - ${article.title} (${article.status})`, 'yellow');
      });
      
      return false;
    }
    
    // Check exclude article
    if (TEST_CONFIG.excludeId) {
      const excludeArticle = await Article.findById(TEST_CONFIG.excludeId);
      if (excludeArticle) {
        log(`✅ Exclude article found: ${excludeArticle.title}`, 'green');
      } else {
        log(`⚠️  Exclude article not found: ${TEST_CONFIG.excludeId}`, 'yellow');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, 'red');
    return false;
  }
}

// Test API endpoint
async function testRelatedArticlesAPI(params = {}) {
  const {
    categoryId = TEST_CONFIG.categoryId,
    limit = 6,
    excludeId = TEST_CONFIG.excludeId,
    sortBy = 'publishedAt',
    sortOrder = 'desc'
  } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    sortBy,
    sortOrder,
    ...(excludeId && { excludeId })
  });
  
  const url = `${API_BASE_URL}/articles/public/related/${categoryId}?${queryParams}`;
  
  try {
    log(`\n🔍 Testing API: ${url}`, 'cyan');
    
    const response = await fetch(url);
    const data = await response.json();
    
    log(`Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    log(`Response status: ${data.status}`, data.status === 'success' ? 'green' : 'red');
    log(`Message: ${data.message}`, 'blue');
    
    if (data.data) {
      log(`Articles returned: ${data.data.articles.length}`, 'blue');
      log(`Total: ${data.data.total}`, 'blue');
      log(`Category ID: ${data.data.categoryId}`, 'blue');
      
      if (data.data.articles.length > 0) {
        log('✅ API returned articles successfully!', 'green');
        log('Sample articles:', 'green');
        data.data.articles.slice(0, 3).forEach((article, index) => {
          log(`  ${index + 1}. ${article.title} (${article.slug})`, 'green');
        });
        return true;
      } else {
        log('❌ API returned empty articles array', 'red');
        return false;
      }
    } else {
      log('❌ No data in response', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ API test failed: ${error.message}`, 'red');
    return false;
  }
}

// Run comprehensive tests
async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive Related Articles API Tests', 'bright');
  log('=' * 60, 'cyan');
  
  // Connect to database
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    process.exit(1);
  }
  
  // Verify database data
  const dataValid = await verifyDatabaseData();
  if (!dataValid) {
    log('\n❌ Database verification failed. Please check your data.', 'red');
    process.exit(1);
  }
  
  log('\n🧪 Running API Tests...', 'cyan');
  
  let successCount = 0;
  let totalTests = 0;
  
  // Test different combinations
  for (const limit of TEST_CONFIG.limits) {
    for (const sortOption of TEST_CONFIG.sortOptions) {
      totalTests++;
      
      const testParams = {
        limit,
        ...sortOption
      };
      
      log(`\n--- Test ${totalTests}: limit=${limit}, sortBy=${sortOption.sortBy}, sortOrder=${sortOption.sortOrder} ---`, 'magenta');
      
      const success = await testRelatedArticlesAPI(testParams);
      if (success) {
        successCount++;
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Test without excludeId
  totalTests++;
  log(`\n--- Test ${totalTests}: Without excludeId ---`, 'magenta');
  const successWithoutExclude = await testRelatedArticlesAPI({ excludeId: null });
  if (successWithoutExclude) {
    successCount++;
  }
  
  // Summary
  log('\n📊 Test Summary', 'bright');
  log('=' * 40, 'cyan');
  log(`Total tests: ${totalTests}`, 'blue');
  log(`Successful tests: ${successCount}`, successCount > 0 ? 'green' : 'red');
  log(`Failed tests: ${totalTests - successCount}`, totalTests - successCount === 0 ? 'green' : 'red');
  log(`Success rate: ${((successCount / totalTests) * 100).toFixed(1)}%`, successCount === totalTests ? 'green' : 'yellow');
  
  if (successCount === totalTests) {
    log('\n🎉 All tests passed! Related Articles API is working correctly.', 'green');
  } else if (successCount > 0) {
    log('\n⚠️  Some tests passed. API is partially working.', 'yellow');
  } else {
    log('\n❌ All tests failed. Please check the API implementation.', 'red');
  }
  
  // Close database connection
  await mongoose.connection.close();
  log('\n📝 Database connection closed.', 'blue');
}

// Run the tests
runComprehensiveTests().catch(error => {
  log(`💥 Test execution failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
