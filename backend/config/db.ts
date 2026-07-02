import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows SRV record resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);
let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    isConnected = false;
    console.error(`❌ MongoDB connection failed: ${error.message}`);
  }
};

export const getIsConnected = (): boolean => isConnected;
