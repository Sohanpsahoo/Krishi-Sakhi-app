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
const schemeSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['national', 'state'], default: 'national' },
    state: { type: String, default: 'All India', index: true },
    department: { type: String, default: 'Ministry of Agriculture & Farmers Welfare' },
    description: { type: String, default: '' },
    highlights: [{ type: String }],
    eligibility: { type: String, default: '' },
    benefits: { type: String, default: '' },
    official_url: { type: String, default: '' },
    launch_year: { type: String, default: '' },
    status: { type: String, enum: ['active', 'closed', 'upcoming'], default: 'active' },
    tags: [{ type: String }]
}, { timestamps: true });
schemeSchema.virtual('id').get(function () { return this._id.toHexString(); });
schemeSchema.set('toJSON', { virtuals: true });
schemeSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Scheme', schemeSchema);
