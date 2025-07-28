import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  tags: [{ type: String }], // e.g. Dev, Design, SaaS
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
