/**
 * Script to fix Category model text search index conflict
 * Run this script to drop and recreate the conflicting index
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university';

async function fixCategoryIndex() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('categories');

    console.log('📋 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the conflicting text search index if it exists
    try {
      console.log('🗑️ Dropping existing text search index...');
      await collection.dropIndex('category_text_search');
      console.log('✅ Successfully dropped existing text search index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Text search index does not exist, continuing...');
      } else {
        console.log('⚠️ Error dropping index:', error.message);
      }
    }

    // Create the new text search index
    console.log('🔨 Creating new text search index...');
    await collection.createIndex({
      name: 'text',
      description: 'text'
    }, {
      weights: {
        name: 10,
        description: 5
      },
      name: 'category_text_search'
    });
    console.log('✅ Successfully created new text search index');

    console.log('📋 Final index list:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('🎉 Category index fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing category index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the fix
fixCategoryIndex();
