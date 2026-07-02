"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const consultantController_1 = require("../controllers/consultantController");
const router = express_1.default.Router();
router.post('/signup', consultantController_1.registerConsultant);
router.post('/login', consultantController_1.loginConsultant);
router.get('/', consultantController_1.listConsultants);
router.get('/:id', consultantController_1.getConsultant);
router.patch('/:id', consultantController_1.updateConsultant);
exports.default = router;
