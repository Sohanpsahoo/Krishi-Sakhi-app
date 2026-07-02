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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const farmerController = __importStar(require("../controllers/farmerController"));
const router = express_1.default.Router();
// POST /api/farmers/login/  — Sign in by phone
router.post('/login', farmerController.login);
router.post('/login/', farmerController.login);
// GET /api/farmers/summary/  — Lightweight list (id, name, district)
router.get('/summary', farmerController.farmerSummary);
router.get('/summary/', farmerController.farmerSummary);
// GET  /api/farmers/         — List all farmers
// POST /api/farmers/         — Create new farmer (sign up)
router.get('/', farmerController.listFarmers);
router.post('/', farmerController.createFarmer);
// GET    /api/farmers/:id/dashboard/ — Dashboard data
router.get('/:id/dashboard', farmerController.getFarmerDashboard);
router.get('/:id/dashboard/', farmerController.getFarmerDashboard);
// GET    /api/farmers/:id/   — Get farmer by ID
// PUT    /api/farmers/:id/   — Update farmer
// DELETE /api/farmers/:id/   — Delete farmer
router.get('/:id', farmerController.getFarmer);
router.get('/:id/', farmerController.getFarmer);
router.put('/:id', farmerController.updateFarmer);
router.put('/:id/', farmerController.updateFarmer);
router.delete('/:id', farmerController.deleteFarmer);
router.delete('/:id/', farmerController.deleteFarmer);
exports.default = router;
