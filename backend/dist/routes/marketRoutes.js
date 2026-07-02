"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketController_1 = require("../controllers/marketController");
const router = express_1.default.Router();
router.get('/crops', marketController_1.getCrops);
router.get('/prices', marketController_1.getPrices);
router.get('/price-history', marketController_1.getPriceHistory);
router.post('/insights', marketController_1.getInsights);
router.post('/transactions', marketController_1.createTransaction);
router.get('/transactions', marketController_1.listTransactions);
exports.default = router;
