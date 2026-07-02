"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schemeController_1 = require("../controllers/schemeController");
const router = express_1.default.Router();
router.get('/', schemeController_1.listSchemes);
router.get('/search', schemeController_1.searchSchemes);
router.get('/:id', schemeController_1.getScheme);
exports.default = router;
