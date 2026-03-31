import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  filename: {
    type: String,
    trim: true,
    default: '',
  },
  imageUrl: {
    type: String,
    trim: true,
    default: '',
  },
  caption: {
    type: String,
    trim: true,
    default: '',
  },
  altText: {
    type: String,
    trim: true,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  coverImageUrl: {
    type: String,
    trim: true,
    default: '',
  },
  photos: {
    type: [photoSchema],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

albumSchema.index({ slug: 1 }, { unique: true });

const Album = mongoose.model('Album', albumSchema);

export default Album;
