import mongoose from 'mongoose';
import express from 'express';
import License from '../models/License.js';
import Product from '../models/Product.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

router.use(authMiddleware);

// Create license
router.post('/', async (req, res) => {
  const {
    product,
    licenseKey,
    expiryDate,
    autoRenew,
    usageLimits,
    status,
    notes,
    clientProject,
        monthlyCost = 0,
    annualCost = 0,
  } = req.body;

  try {
    // Verify product belongs to user
    const productExists = await Product.findOne({ _id: product, user: req.user.id });
    if (!productExists) return res.status(404).json({ message: 'Product not found' });

    const encryptedKey = encrypt(licenseKey);
    const license = new License({
      product,
      licenseKey: encryptedKey,
      expiryDate,
      autoRenew,
      usageLimits,
      status,
      notes,
      clientProject,
       monthlyCost,
      annualCost,
    });

    await license.save();
    // Decrypt licenseKey before sending response
    const licenseObj = license.toObject();
    licenseObj.licenseKey = decrypt(license.licenseKey);

    res.json(licenseObj);
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get licenses by user (populate product)
router.get('/', async (req, res) => {
  try {
    const { tag, status, clientProject, search } = req.query;

    // Get products belonging to the user
    const products = await Product.find({ user: req.user.id });
    const productIds = products.map(p => p._id);

    // Base filter
    let filter = { product: { $in: productIds } };

    if (status) filter.status = status;
    if (clientProject) filter.clientProject = clientProject;

    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { licenseKey: { $regex: search, $options: 'i' } }, // encrypted text search
      ];
    }

    // Get licenses and populate product
    let licenses = await License.find(filter).populate('product');

    // Filter by tag (manually after populate)
    if (tag) {
      licenses = licenses.filter(lic => lic.product?.tags?.includes(tag));
    }

    // Decrypt license key before sending
    const decryptedLicenses = licenses.map(lic => {
      const licObj = lic.toObject();
      licObj.licenseKey = decrypt(lic.licenseKey);
      return licObj;
    });

    res.json(decryptedLicenses);
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update license
router.put('/:id', async (req, res) => {
  const {
    licenseKey,
    expiryDate,
    autoRenew,
    usageLimits,
    status,
    notes,
    clientProject,
    monthlyCost,
    annualCost,
  } = req.body;

  try {
    const license = await License.findById(req.params.id).populate('product');
    if (!license) return res.status(404).json({ message: 'License not found' });

    // Check license belongs to user
    if (license.product.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Encrypt new license key only if provided
    if (licenseKey) {
      license.licenseKey = encrypt(licenseKey);
    }

    // Update other fields
    license.expiryDate = expiryDate || license.expiryDate;
    license.autoRenew = autoRenew ?? license.autoRenew;
    license.usageLimits = usageLimits || license.usageLimits;
    license.status = status || license.status;
    license.notes = notes || license.notes;
    license.clientProject = clientProject || license.clientProject;

        if (monthlyCost !== undefined) license.monthlyCost = monthlyCost;
    if (annualCost !== undefined) license.annualCost = annualCost;

    await license.save();

    // Decrypt license key before sending response
    const licenseObj = license.toObject();
    licenseObj.licenseKey = decrypt(license.licenseKey);

    res.json(licenseObj);
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete license
router.delete('/:id', async (req, res) => {
  try {
    // Validate ID format first
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid license ID format' 
      });
    }

    // Find license with product and owner info
    const license = await License.findById(req.params.id)
      .populate({
        path: 'product',
        select: 'user'
      });

    if (!license) {
      return res.status(404).json({ 
        success: false,
        message: 'License not found' 
      });
    }

    // Verify ownership
    if (!license.product || license.product.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized to delete this license' 
      });
    }

    // Delete operation (modern Mongoose syntax)
    await License.deleteOne({ _id: req.params.id });

    return res.json({ 
      success: true,
      message: 'License deleted successfully',
      deletedId: req.params.id
    });

  } catch (error) {
    console.error('Delete license error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to delete license',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
