"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherForLocation = exports.getHourlyForecast = exports.getDailyForecast = exports.getCurrentWeather = void 0;
const axios_1 = __importDefault(require("axios"));
const GeoCache_1 = __importDefault(require("../models/GeoCache"));
const db_1 = require("../config/db");
const API_KEY = process.env.OPENWEATHER_API_KEY;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE = 'http://api.openweathermap.org/geo/1.0';
// In-memory fallback cache when MongoDB is not available
const memoryCache = new Map();
// ─── Helper: Resolve district+state → lat/lon (with cache) ──────────
async function getCoordinates(district, state) {
    const cacheKey = `${district}__${state}`;
    // 1. Try MongoDB cache
    if ((0, db_1.getIsConnected)()) {
        try {
            const cached = await GeoCache_1.default.findOne({ district, state });
            if (cached)
                return { lat: cached.lat, lon: cached.lon };
        }
        catch (e) {
            // MongoDB read failed, continue to memory cache
        }
    }
    // 2. Try in-memory cache
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey);
    }
    // 3. Call OpenWeatherMap Geocoding API
    const { data } = await axios_1.default.get(`${GEO_BASE}/direct`, {
        params: { q: `${district},${state},IN`, limit: 1, appid: API_KEY },
    });
    if (!data || data.length === 0) {
        throw new Error(`Could not geocode "${district}, ${state}"`);
    }
    const coords = { lat: data[0].lat, lon: data[0].lon };
    // 4. Save to caches
    memoryCache.set(cacheKey, coords);
    if ((0, db_1.getIsConnected)()) {
        GeoCache_1.default.create({ district, state, ...coords }).catch(() => { });
    }
    return coords;
}
// ─── GET /api/weather/current ────────────────────────────────────────
const getCurrentWeather = async (req, res, next) => {
    try {
        const { district, state } = req.query;
        if (!district || !state || typeof district !== 'string' || typeof state !== 'string') {
            return res.status(400).json({ error: 'district and state query params are required' });
        }
        const { lat, lon } = await getCoordinates(district, state);
        const { data } = await axios_1.default.get(`${OWM_BASE}/weather`, {
            params: { lat, lon, appid: API_KEY, units: 'metric' },
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
};
exports.getCurrentWeather = getCurrentWeather;
// ─── GET /api/weather/daily ──────────────────────────────────────────
const getDailyForecast = async (req, res, next) => {
    try {
        const { district, state } = req.query;
        if (!district || !state || typeof district !== 'string' || typeof state !== 'string') {
            return res.status(400).json({ error: 'district and state query params are required' });
        }
        const { lat, lon } = await getCoordinates(district, state);
        // Free tier: 5-day / 3-hour forecast — aggregate into one entry per day
        const { data } = await axios_1.default.get(`${OWM_BASE}/forecast`, {
            params: { lat, lon, appid: API_KEY, units: 'metric' },
        });
        const dailyMap = {};
        (data.list || []).forEach((entry) => {
            const dateKey = entry.dt_txt.split(' ')[0];
            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = entry;
            }
        });
        const dailyList = Object.values(dailyMap).slice(0, 7);
        res.json({ ...data, list: dailyList });
    }
    catch (err) {
        next(err);
    }
};
exports.getDailyForecast = getDailyForecast;
// ─── GET /api/weather/hourly ─────────────────────────────────────────
const getHourlyForecast = async (req, res, next) => {
    try {
        const { district, state } = req.query;
        if (!district || !state || typeof district !== 'string' || typeof state !== 'string') {
            return res.status(400).json({ error: 'district and state query params are required' });
        }
        const { lat, lon } = await getCoordinates(district, state);
        const { data } = await axios_1.default.get(`${OWM_BASE}/forecast`, {
            params: { lat, lon, appid: API_KEY, units: 'metric' },
        });
        res.json({ ...data, list: (data.list || []).slice(0, 24) });
    }
    catch (err) {
        next(err);
    }
};
exports.getHourlyForecast = getHourlyForecast;
// ─── INTERNAL PROGRAMMATIC ACCESS ────────────────────────────────────
const getWeatherForLocation = async (district, state) => {
    const { lat, lon } = await getCoordinates(district, state);
    const { data } = await axios_1.default.get(`${OWM_BASE}/weather`, {
        params: { lat, lon, appid: API_KEY, units: 'metric' },
    });
    return data;
};
exports.getWeatherForLocation = getWeatherForLocation;
