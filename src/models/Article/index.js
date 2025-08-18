import mongoose from 'mongoose';
import articleSchema from './schema.js';
import addVirtuals from './virtuals.js';
import addStatics from './statics.js';
import addMethods from './methods.js';
import addHooks from './hooks.js';

// Apply all enhancements to the schema
addVirtuals(articleSchema);
addStatics(articleSchema);
addMethods(articleSchema);
addHooks(articleSchema);

// Create indexes for better query performance
articleSchema.index({ slug: 1 }, { unique: true });
articleSchema.index({ title: 1 });
articleSchema.index({ status: 1 });
articleSchema.index({ author: 1 });
articleSchema.index({ categories: 1 });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ updatedAt: -1 });
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ viewCount: -1 });
articleSchema.index({ likeCount: -1 });
articleSchema.index({ featured: 1 });
articleSchema.index({ sortOrder: 1 });

// Compound indexes for common queries
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, featured: 1, sortOrder: 1 });
articleSchema.index({ status: 1, viewCount: -1 });
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ categories: 1, status: 1 });
articleSchema.index({ categories: 1, publishedAt: -1 });
articleSchema.index({ featured: 1, publishedAt: -1 });
articleSchema.index({ tags: 1, status: 1 });

// Text index for search functionality
articleSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  metaTitle: 'text',
  metaDescription: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    metaTitle: 8,
    excerpt: 6,
    metaDescription: 5,
    tags: 4,
    content: 2
  },
  name: 'article_text_search'
});

// Sparse indexes for optional fields
articleSchema.index({ createdBy: 1 }, { sparse: true });
articleSchema.index({ updatedBy: 1 }, { sparse: true });
articleSchema.index({ publishedAt: 1 }, { sparse: true });

// Create the Article model
const Article = mongoose.model('Article', articleSchema);

export default Article;
