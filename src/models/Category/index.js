import mongoose from 'mongoose';
import categorySchema from './schema.js';
import addVirtuals from './virtuals.js';
import addStatics from './statics.js';
import addMethods from './methods.js';
import addHooks from './hooks.js';

// Apply all enhancements to the schema
addVirtuals(categorySchema);
addStatics(categorySchema);
addMethods(categorySchema);
addHooks(categorySchema);

// Create indexes for better query performance
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ createdAt: -1 });
categorySchema.index({ updatedAt: -1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ articleCount: -1 });

// Compound indexes for common queries
categorySchema.index({ status: 1, sortOrder: 1 });
categorySchema.index({ status: 1, articleCount: -1 });
categorySchema.index({ status: 1, createdAt: -1 });
categorySchema.index({ status: 1, name: 1 });

// Text index for search functionality
categorySchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  },
  name: 'category_text_search'
});

// Sparse indexes for optional fields
categorySchema.index({ createdBy: 1 }, { sparse: true });
categorySchema.index({ updatedBy: 1 }, { sparse: true });

// Create the Category model
const Category = mongoose.model('Category', categorySchema);

export default Category;
