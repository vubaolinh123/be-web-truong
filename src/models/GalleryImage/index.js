import mongoose from 'mongoose';

export const GALLERY_SLOTS = [
  'co-so-vat-chat',
  'hoat-dong-sinh-vien',
  'thu-vien',
  'phong-thuc-hanh'
];

const galleryImageSchema = new mongoose.Schema({
  slot: {
    type: String,
    required: [true, 'Slot is required'],
    enum: GALLERY_SLOTS,
    unique: true,
    trim: true,
  },
  label: {
    type: String,
    trim: true,
    default: '',
  },
  imageUrl: {
    type: String,
    trim: true,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

galleryImageSchema.index({ slot: 1 }, { unique: true });

const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);

export default GalleryImage;
