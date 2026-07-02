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
const consultantSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    designation: { type: String, required: true },
    department: { type: String, default: 'Independent Consultant' },
    specialization: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, default: '' },
    office_address: { type: String, default: '' },
    available_hours: { type: String, default: '10:00 AM - 5:00 PM' },
    experience_years: { type: Number, default: 1 },
    languages: { type: String, default: 'Hindi, English' },
    rating: { type: Number, default: 4.0, min: 1, max: 5 },
    is_available: { type: Boolean, default: true },
    consultation_fee: { type: String, default: 'Free' },
    photo_url: { type: String, default: '' },
    is_online: { type: Boolean, default: false },
    socket_id: { type: String, default: '' },
}, { timestamps: true });
consultantSchema.virtual('id').get(function () { return this._id.toHexString(); });
consultantSchema.set('toJSON', { virtuals: true });
consultantSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Consultant', consultantSchema);
