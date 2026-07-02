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
const farmSchema = new mongoose_1.Schema({
    farmer: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: [true, 'Farmer is required'],
    },
    name: {
        type: String,
        required: [true, 'Farm name is required'],
        trim: true,
    },
    district: {
        type: String,
        trim: true,
    },
    state: {
        type: String,
        trim: true,
    },
    land_size_acres: {
        type: Number,
        required: [true, 'Land size is required'],
    },
    soil_type: {
        type: String,
        default: 'loamy',
    },
    irrigation_type: {
        type: String,
        default: 'rain_fed',
    },
    primary_crops: {
        type: String,
        default: '',
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    nitrogen_value: {
        type: Number,
        min: 0,
        max: 140,
    },
    phosphorus_value: {
        type: Number,
        min: 0,
        max: 145,
    },
    potassium_value: {
        type: Number,
        min: 0,
        max: 205,
    },
    soil_ph: {
        type: Number,
        min: 0,
        max: 14,
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
farmSchema.virtual('id').get(function () { return this._id.toHexString(); });
farmSchema.set('toJSON', { virtuals: true });
farmSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Farm', farmSchema);
