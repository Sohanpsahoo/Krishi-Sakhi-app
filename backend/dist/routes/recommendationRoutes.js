"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const recommendationController_1 = require("../controllers/recommendationController");
const router = express_1.default.Router();
// POST /api/recommendations/crop
router.post('/crop', recommendationController_1.getCropRecommendation);
// GET /api/recommendations/history/:farmerId
router.get('/history/:farmerId', recommendationController_1.getRecommendationHistory);
exports.default = router;
