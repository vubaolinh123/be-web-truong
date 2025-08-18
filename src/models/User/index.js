import mongoose from 'mongoose';
import userSchema from './schema.js';
import addVirtuals from './virtuals.js';
import addStatics from './statics.js';
import addMethods from './methods.js';
import addHooks from './hooks.js';

// Apply all enhancements to the schema
addVirtuals(userSchema);
addStatics(userSchema);
addMethods(userSchema);
addHooks(userSchema);

// Create indexes for better query performance
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ emailVerified: 1 });

// Compound indexes for common queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });

// Text index for search functionality
userSchema.index({
  username: 'text',
  email: 'text',
  firstName: 'text',
  lastName: 'text'
}, {
  weights: {
    username: 10,
    email: 8,
    firstName: 5,
    lastName: 5
  },
  name: 'user_text_search'
});

// Create the User model
const User = mongoose.model('User', userSchema);

export default User;
