"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_MODELS = void 0;
exports.getCurrentKey = getCurrentKey;
exports.rotateKey = rotateKey;
exports.getGenAI = getGenAI;
exports.isQuotaError = isQuotaError;
exports.isRetryableError = isRetryableError;
exports.executeWithFallback = executeWithFallback;
exports.executeWithModelAndKeyFallback = executeWithModelAndKeyFallback;
exports.executeWithGenAI = executeWithGenAI;
const generative_ai_1 = require("@google/generative-ai");
/**
 * Gemini API Key + Model Manager
 *
 * Provides:
 *  - Round-robin key rotation across GEMINI_API_KEYS
 *  - Model-level fallback across multiple Gemini models
 *  - Combined key × model fallback for maximum resilience
 */
// ── Gemini model fallback chain (newest → oldest) ───────────────────
exports.GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
];
// ── Load keys ────────────────────────────────────────────────────────
function loadKeys() {
    const multi = process.env.GEMINI_API_KEYS;
    if (multi) {
        const keys = multi.split(',').map(k => k.trim()).filter(Boolean);
        if (keys.length > 0)
            return keys;
    }
    const single = process.env.GEMINI_API_KEY;
    if (single)
        return [single];
    return [];
}
const API_KEYS = loadKeys();
let currentKeyIndex = 0;
console.log(`🔑 Gemini key pool loaded: ${API_KEYS.length} key(s) available`);
console.log(`🤖 Gemini model chain: ${exports.GEMINI_MODELS.join(' → ')}`);
// ── Public helpers ───────────────────────────────────────────────────
/** Get the currently-active API key (plain string). */
function getCurrentKey() {
    if (API_KEYS.length === 0)
        return '';
    return API_KEYS[currentKeyIndex % API_KEYS.length];
}
/** Rotate to the next key in the pool and return it. */
function rotateKey() {
    if (API_KEYS.length <= 1)
        return getCurrentKey();
    const oldIndex = currentKeyIndex;
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`🔄 Rotated Gemini key: slot ${oldIndex} → slot ${currentKeyIndex}`);
    return getCurrentKey();
}
/** Build a fresh GoogleGenerativeAI SDK instance with the current key. */
function getGenAI() {
    return new generative_ai_1.GoogleGenerativeAI(getCurrentKey());
}
/** Returns true if error looks like a quota / rate-limit / model-not-found failure. */
function isQuotaError(err) {
    const msg = (err?.message || err?.statusText || '').toLowerCase();
    const status = err?.status || err?.response?.status || 0;
    return (status === 429 ||
        status === 403 ||
        msg.includes('quota') ||
        msg.includes('429') ||
        msg.includes('resource_exhausted') ||
        msg.includes('rate limit') ||
        msg.includes('rate_limit') ||
        msg.includes('too many requests'));
}
/** Returns true if a model fallback should be attempted. */
function isRetryableError(err) {
    const msg = (err?.message || err?.statusText || '').toLowerCase();
    const status = err?.status || err?.response?.status || 0;
    return (isQuotaError(err) ||
        status === 404 ||
        status === 503 ||
        msg.includes('not found') ||
        msg.includes('not supported') ||
        msg.includes('deprecated') ||
        msg.includes('overloaded') ||
        msg.includes('unavailable'));
}
/**
 * Execute an async operation trying every KEY in the pool.
 * On quota/rate-limit errors the key is rotated and the operation retried.
 *
 * @param operation  Receives the current API key string; return your result.
 */
async function executeWithFallback(operation) {
    const maxRetries = Math.max(API_KEYS.length, 1);
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const key = getCurrentKey();
        if (!key)
            throw new Error('No Gemini API keys configured');
        try {
            return await operation(key);
        }
        catch (err) {
            lastError = err;
            if (isQuotaError(err) && attempt < maxRetries - 1) {
                console.warn(`⚠️ Gemini key slot ${currentKeyIndex} hit quota/rate-limit. Rotating...`);
                rotateKey();
            }
            else {
                throw err;
            }
        }
    }
    throw lastError || new Error('All Gemini API keys exhausted');
}
/**
 * Execute a fetch-based Gemini API call trying every COMBINATION of
 * model × key.  This is the most resilient approach for raw `fetch()` usage.
 *
 * @param buildRequest  Receives (apiKey, modelName) → should return the fetch Response.
 */
async function executeWithModelAndKeyFallback(buildRequest, models = exports.GEMINI_MODELS) {
    let lastError;
    for (const model of models) {
        // For each model, try all keys
        for (let keyAttempt = 0; keyAttempt < API_KEYS.length; keyAttempt++) {
            const key = getCurrentKey();
            if (!key)
                throw new Error('No Gemini API keys configured');
            try {
                return await buildRequest(key, model);
            }
            catch (err) {
                lastError = err;
                const msg = (err?.message || '').toLowerCase();
                console.warn(`⚠️ Model ${model} + key slot ${currentKeyIndex} failed: ${msg.slice(0, 100)}`);
                if (isQuotaError(err)) {
                    // Quota error → try next key with same model
                    rotateKey();
                }
                else if (isRetryableError(err)) {
                    // Model error (404, unavailable, etc.) → try next model
                    break;
                }
                else {
                    throw err; // Non-retryable error
                }
            }
        }
    }
    throw lastError || new Error('All Gemini models and keys exhausted');
}
/**
 * Same as executeWithModelAndKeyFallback, but for the GoogleGenerativeAI SDK.
 * Tries each model × key combination.
 */
async function executeWithGenAI(operation, models = exports.GEMINI_MODELS) {
    let lastError;
    for (const model of models) {
        for (let keyAttempt = 0; keyAttempt < API_KEYS.length; keyAttempt++) {
            try {
                return await operation(getGenAI(), model);
            }
            catch (err) {
                lastError = err;
                const msg = (err?.message || '').toLowerCase();
                console.warn(`⚠️ SDK model ${model} + key slot ${currentKeyIndex} failed: ${msg.slice(0, 100)}`);
                if (isQuotaError(err)) {
                    rotateKey();
                }
                else if (isRetryableError(err)) {
                    break; // Try next model
                }
                else {
                    throw err;
                }
            }
        }
    }
    throw lastError || new Error('All Gemini models and keys exhausted');
}
