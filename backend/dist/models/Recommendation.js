"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const RecommendationSchema = new mongoose_1.Schema({
    farmer: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Farmer' },
    farm: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Farm', default: null },
    soilData: {
        N: { type: Number, required: true },
        P: { type: Number, required: true },
        K: { type: Number, required: true },
        ph: { type: Number, required: true },
    },
    weather: {
        temperature: Number,
        humidity: Number,
        rainfall: Number,
        location: String,
    },
    recommendedCrop: { type: String, required: true },
    confidence: { type: Number },
    alternativeCrops: [{ type: String }],
    // Gemini-generated fields
    explanation: { type: String },
    soilInsights: { type: String },
    growingTips: [{ type: String }],
    warnings: [{ type: String }],
    bestSowingTime: { type: String },
    estimatedYield: { type: String },
}, { timestamps: true });
RecommendationSchema.virtual('id').get(function () { return this._id.toHexString(); });
RecommendationSchema.set('toJSON', { virtuals: true });
RecommendationSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Recommendation', RecommendationSchema);
