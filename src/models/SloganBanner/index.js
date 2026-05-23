import mongoose from 'mongoose';

const sloganBannerSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

sloganBannerSchema.index({ order: 1, createdAt: 1 });

const SloganBanner = mongoose.model('SloganBanner', sloganBannerSchema);

export default SloganBanner;
