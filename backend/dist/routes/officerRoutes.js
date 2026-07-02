"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const officerController_1 = require("../controllers/officerController");
const router = express_1.default.Router();
router.get('/helplines', officerController_1.getGovernmentHelplines);
router.get('/ai-experts', officerController_1.getAIExperts);
router.post('/ai-experts/save', officerController_1.saveAIExpert);
router.get('/', officerController_1.listOfficers);
router.get('/:id', officerController_1.getOfficer);
router.post('/consultations', officerController_1.bookConsultation);
router.get('/consultations/list', officerController_1.listConsultations);
router.patch('/consultations/:id/cancel', officerController_1.cancelConsultation);
exports.default = router;
