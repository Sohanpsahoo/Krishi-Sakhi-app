"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsConnected = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI environment variable is not set!');
        return;
    }
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        isConnected = false;
        console.error(`❌ MongoDB connection failed: ${error.message}`);
    }
};
exports.connectDB = connectDB;
const getIsConnected = () => isConnected;
exports.getIsConnected = getIsConnected;
