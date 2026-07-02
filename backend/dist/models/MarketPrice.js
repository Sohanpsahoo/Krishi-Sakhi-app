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
const marketPriceSchema = new mongoose_1.Schema({
    state: { type: String, required: true, index: true },
    district: { type: String, index: true },
    market: { type: String, required: true },
    commodity: { type: String, required: true, index: true },
    variety: { type: String, default: 'Other' },
    grade: { type: String, default: 'FAQ' },
    min_price: { type: Number, default: 0 },
    max_price: { type: Number, default: 0 },
    modal_price: { type: Number, default: 0 },
    arrival_date: { type: Date },
    fetched_at: { type: Date, default: Date.now },
    scraped: { type: Boolean, default: false }
}, { timestamps: true });
marketPriceSchema.index({ state: 1, commodity: 1, arrival_date: -1 });
marketPriceSchema.virtual('id').get(function () { return this._id.toHexString(); });
marketPriceSchema.set('toJSON', { virtuals: true });
marketPriceSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('MarketPrice', marketPriceSchema);
