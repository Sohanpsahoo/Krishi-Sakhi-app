import express, { Router } from 'express';
import { sttTranslate, sttTranslateBase64, translateText, translateBatch } from '../controllers/sarvamController';

const router: Router = express.Router();

// POST /api/sarvam/stt-translate — Audio file → English translated text
router.post('/stt-translate', ...sttTranslate);

// POST /api/sarvam/stt-translate-base64 — Base64 audio JSON → English (for React Native)
router.post('/stt-translate-base64', sttTranslateBase64);
// POST /api/sarvam/translate — Text → translated text
router.post('/translate', translateText);

// POST /api/sarvam/translate-batch — Array of texts → translated texts
router.post('/translate-batch', translateBatch);

export default router;
