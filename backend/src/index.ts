import 'dotenv/config';
import mongoose from 'mongoose';
import { join, resolve } from 'node:path';
import { createApp } from './app';

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tasktrack';
const port = Number(process.env.PORT ?? 4000);
const production = process.env.NODE_ENV === 'production';
const staticDir = production ? join(resolve(import.meta.dirname, '../../frontend'), 'dist') : undefined;

if (production && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
} catch (error) {
  console.error('Could not connect to MongoDB. Check that it is running and that MONGODB_URI is correct.');
  console.error((error as Error).message);
  process.exit(1);
}

createApp(staticDir).listen(port, () => {
  console.log(`API ready on http://localhost:${port}`);
});
