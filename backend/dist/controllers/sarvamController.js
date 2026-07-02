"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateBatch = exports.translateText = exports.sttTranslateBase64 = exports.sttTranslate = void 0;
const axios_1 = __importDefault(require("axios"));
const multer_1 = __importDefault(require("multer"));
const form_data_1 = __importDefault(require("form-data"));
// ── Multer: store uploaded audio in memory ──
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const SARVAM_API_BASE = 'https://api.sarvam.ai';
/**
 * Get API key — always from env, never touches Gemini key
 */
function getSarvamApiKey() {
    return process.env.SARVAM_API_KEY;
}
// ---------------------------------------------------------------------------
// POST /api/sarvam/stt-translate
// Accepts audio file → sends to Sarvam STT-Translate → returns English text
// ---------------------------------------------------------------------------
exports.sttTranslate = [
    upload.single('audio'),
    async (req, res) => {
        try {
            const apiKey = getSarvamApiKey();
            if (!apiKey) {
                return res.status(500).json({ success: false, message: 'SARVAM_API_KEY not configured' });
            }
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'Audio file is required' });
            }
            console.log(`🎙️ Sarvam STT-Translate: Received audio (${file.size} bytes, ${file.mimetype})`);
            // Build multipart form for Sarvam API
            const form = new form_data_1.default();
            form.append('file', file.buffer, {
                filename: file.originalname || 'audio.webm',
                contentType: file.mimetype || 'audio/webm',
            });
            form.append('model', 'saaras:v2.5');
            const response = await axios_1.default.post(`${SARVAM_API_BASE}/speech-to-text-translate`, form, {
                headers: {
                    ...form.getHeaders(),
                    'api-subscription-key': apiKey,
                },
                timeout: 30000,
            });
            const data = response.data;
            console.log('✅ Sarvam STT-Translate response:', JSON.stringify(data).slice(0, 200));
            return res.status(200).json({
                success: true,
                transcript: data.transcript || '',
                translated_text: data.translated_text || data.transcript || '',
                language_detected: data.language_code || 'unknown',
            });
        }
        catch (err) {
            console.error('❌ Sarvam STT-Translate error:', err.response?.data || err.message);
            return res.status(500).json({
                success: false,
                message: 'Speech-to-text translation failed',
                error: err.response?.data?.message || err.message,
            });
        }
    },
];
// ---------------------------------------------------------------------------
// POST /api/sarvam/stt-translate-base64
// Accepts JSON { audio_base64, mime_type } → sends to Sarvam → returns English
// This is for React Native where file uploads are unreliable
// ---------------------------------------------------------------------------
const sttTranslateBase64 = async (req, res) => {
    try {
        const apiKey = getSarvamApiKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'SARVAM_API_KEY not configured' });
        }
        const { audio_base64, mime_type } = req.body;
        if (!audio_base64) {
            return res.status(400).json({ success: false, message: 'audio_base64 is required' });
        }
        // Decode base64 to buffer
        const audioBuffer = Buffer.from(audio_base64, 'base64');
        // Normalize MIME type: audio/m4a is not valid, use audio/mp4 for .m4a files
        let mimeType = mime_type || 'audio/mp4';
        if (mimeType === 'audio/m4a')
            mimeType = 'audio/mp4';
        // Determine file extension from mime type
        const extMap = { 'audio/mp4': '.m4a', 'audio/wav': '.wav', 'audio/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/aac': '.aac' };
        const ext = extMap[mimeType] || '.m4a';
        const filename = `recording${ext}`;
        console.log(`🎙️ Sarvam STT-Translate (base64): Received audio (${audioBuffer.length} bytes, ${mimeType}, ${filename})`);
        // Build multipart form for Sarvam API
        const form = new form_data_1.default();
        form.append('file', audioBuffer, {
            filename,
            contentType: mimeType,
        });
        form.append('model', 'saaras:v2.5');
        const response = await axios_1.default.post(`${SARVAM_API_BASE}/speech-to-text-translate`, form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': apiKey,
            },
            timeout: 30000,
        });
        const data = response.data;
        console.log('✅ Sarvam STT-Translate (base64) response:', JSON.stringify(data).slice(0, 200));
        return res.status(200).json({
            success: true,
            transcript: data.transcript || '',
            translated_text: data.translated_text || data.transcript || '',
            language_detected: data.language_code || 'unknown',
        });
    }
    catch (err) {
        const errData = err.response?.data;
        console.error('❌ Sarvam STT-Translate (base64) error:', JSON.stringify(errData) || err.message);
        console.error('❌ Status:', err.response?.status, 'Headers:', JSON.stringify(err.response?.headers || {}));
        return res.status(err.response?.status || 500).json({
            success: false,
            message: 'Speech-to-text translation failed',
            error: errData?.message || errData?.error || err.message,
            details: errData,
        });
    }
};
exports.sttTranslateBase64 = sttTranslateBase64;
// ---------------------------------------------------------------------------
// POST /api/sarvam/translate
// Accepts JSON { text, source_language_code, target_language_code }
// Returns translated text
// ---------------------------------------------------------------------------
const translateText = async (req, res) => {
    try {
        const apiKey = getSarvamApiKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'SARVAM_API_KEY not configured' });
        }
        const { text, source_language_code, target_language_code } = req.body;
        if (!text || !target_language_code) {
            return res.status(400).json({
                success: false,
                message: 'text and target_language_code are required',
            });
        }
        // If source and target are the same, return as-is
        if (source_language_code === target_language_code) {
            return res.status(200).json({ success: true, translated_text: text });
        }
        console.log(`🌐 Sarvam Translate: ${source_language_code} → ${target_language_code} (${text.length} chars)`);
        // Sarvam API has character limits (~2000 for sarvam-translate:v1)
        // Chunk if needed
        const MAX_CHARS = 1900;
        let chunks = [];
        if (text.length > MAX_CHARS) {
            // Split by sentences
            const sentences = text.match(/[^.!?।]+[.!?।]?/g) || [text];
            let current = '';
            for (const sentence of sentences) {
                if (current.length + sentence.length > MAX_CHARS) {
                    if (current)
                        chunks.push(current.trim());
                    current = sentence;
                }
                else {
                    current += sentence;
                }
            }
            if (current)
                chunks.push(current.trim());
        }
        else {
            chunks = [text];
        }
        const translatedParts = [];
        for (const chunk of chunks) {
            const payload = {
                input: chunk,
                source_language_code: source_language_code || 'auto',
                target_language_code: target_language_code,
                model: 'mayura:v1',
                enable_preprocessing: true,
            };
            const response = await axios_1.default.post(`${SARVAM_API_BASE}/translate`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': apiKey,
                },
                timeout: 15000,
            });
            translatedParts.push(response.data.translated_text || chunk);
        }
        const translatedText = translatedParts.join(' ');
        console.log(`✅ Sarvam Translate done: "${translatedText.slice(0, 100)}..."`);
        return res.status(200).json({
            success: true,
            translated_text: translatedText,
        });
    }
    catch (err) {
        console.error('❌ Sarvam Translate error:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Translation failed',
            error: err.response?.data?.message || err.message,
        });
    }
};
exports.translateText = translateText;
// ---------------------------------------------------------------------------
// POST /api/sarvam/translate-batch
// Accepts JSON { texts: string[], source_language_code, target_language_code }
// Translates an array of strings in one request (processes sequentially)
// ---------------------------------------------------------------------------
const translateBatch = async (req, res) => {
    try {
        const apiKey = getSarvamApiKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'SARVAM_API_KEY not configured' });
        }
        const { texts, source_language_code, target_language_code } = req.body;
        if (!texts || !Array.isArray(texts) || !target_language_code) {
            return res.status(400).json({
                success: false,
                message: 'texts (array) and target_language_code are required',
            });
        }
        // If source and target are the same, return as-is
        if (source_language_code === target_language_code) {
            return res.status(200).json({ success: true, translated_texts: texts });
        }
        console.log(`🌐 Sarvam Batch Translate: ${texts.length} strings, ${source_language_code} → ${target_language_code}`);
        const results = [];
        for (const text of texts) {
            // Skip empty text or numbers-only
            if (!text || !text.trim() || /^[\d\s.,₹%+\-/*=()]+$/.test(text.trim())) {
                results.push(text);
                continue;
            }
            try {
                const payload = {
                    input: text.slice(0, 1900), // enforce limit
                    source_language_code: source_language_code || 'en',
                    target_language_code: target_language_code,
                    model: 'mayura:v1',
                    enable_preprocessing: true,
                };
                const response = await axios_1.default.post(`${SARVAM_API_BASE}/translate`, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-subscription-key': apiKey,
                    },
                    timeout: 10000,
                });
                results.push(response.data.translated_text || text);
            }
            catch (err) {
                console.warn(`⚠️ Batch item translation failed: ${err.message}`);
                results.push(text); // fallback to original
            }
        }
        return res.status(200).json({
            success: true,
            translated_texts: results,
        });
    }
    catch (err) {
        console.error('❌ Sarvam Batch Translate error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Batch translation failed',
            error: err.message,
        });
    }
};
exports.translateBatch = translateBatch;
