"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sarvamController_1 = require("../controllers/sarvamController");
const router = express_1.default.Router();
// POST /api/sarvam/stt-translate — Audio file → English translated text
router.post('/stt-translate', ...sarvamController_1.sttTranslate);
// POST /api/sarvam/stt-translate-base64 — Base64 audio JSON → English (for React Native)
router.post('/stt-translate-base64', sarvamController_1.sttTranslateBase64);
// POST /api/sarvam/translate — Text → translated text
router.post('/translate', sarvamController_1.translateText);
// POST /api/sarvam/translate-batch — Array of texts → translated texts
router.post('/translate-batch', sarvamController_1.translateBatch);
exports.default = router;
