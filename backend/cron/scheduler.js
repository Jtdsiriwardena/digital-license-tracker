// cron/scheduler.js
import cron from 'node-cron';
import License from '../models/License.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendEmailReminder } from '../utils/sendEmail.js';
import Notification from '../models/Notification.js';



export const checkExpiringLicenses = async () => {
  console.log('Running license expiry check...');
  const now = new Date();

  // Alert intervals in days
  const alertDays = [7, 3, 1];

  try {
    for (const daysBefore of alertDays) {
      const alertDateStart = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);
      const alertDateEnd = new Date(now.getTime() + (daysBefore + 1) * 24 * 60 * 60 * 1000);


      // Find licenses expiring exactly in "daysBefore" days
      const licenses = await License.find({
        expiryDate: { $gte: alertDateStart, $lt: alertDateEnd },
        status: 'Active',
      }).populate({
        path: 'product',
        populate: { path: 'user' }
      });

      console.log(`Found ${licenses.length} licenses expiring in ${daysBefore} days.`);

      for (const license of licenses) {
        const user = license.product.user;
        console.log(`Processing license for product "${license.product.name}" owned by ${user.email}`);
        
        await sendEmailReminder(user.email, license, daysBefore);
        console.log(`Email sent to ${user.email}`);

        await Notification.create({
          user: user._id,
          message: `License for ${license.product.name} expires in ${daysBefore} day${daysBefore > 1 ? 's' : ''}.`,
        });
        console.log(`In-app notification created for user ${user.email}`);
      }
    }
  } catch (err) {
    console.error('Error in scheduler:', err);
  }
};



export const startScheduler = () => {
  cron.schedule('0 9 * * *', () => {
    checkExpiringLicenses();
  });
};
