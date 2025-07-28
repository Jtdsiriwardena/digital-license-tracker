// testScheduler.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { checkExpiringLicenses } from './cron/scheduler.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function runTest() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to DB');

    await checkExpiringLicenses();

    console.log('✅ Manual test run complete. Exiting...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test run error:', error);
    process.exit(1);
  }
}

runTest();
