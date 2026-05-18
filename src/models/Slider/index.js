import mongoose from 'mongoose';

const sliderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    ctaText: {
      type: String,
      trim: true,
      default: '',
    },
    ctaHref: {
      type: String,
      trim: true,
      default: '',
    },
    bgColor: {
      type: String,
      trim: true,
      default: 'from-blue-900 to-blue-700',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

sliderSchema.index({ order: 1, createdAt: 1 });

const Slider = mongoose.model('Slider', sliderSchema);

export default Slider;
