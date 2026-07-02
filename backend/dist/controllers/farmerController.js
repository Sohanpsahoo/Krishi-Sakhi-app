"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmerDashboard = exports.deleteFarmer = exports.updateFarmer = exports.getFarmer = exports.createFarmer = exports.farmerSummary = exports.listFarmers = exports.login = void 0;
const Farmer_1 = __importDefault(require("../models/Farmer"));
// ─── POST /api/farmers/login/ — Sign In by phone ────────────────────
const login = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        const farmer = await Farmer_1.default.findOne({ phone: phone.trim() });
        if (!farmer) {
            return res
                .status(404)
                .json({ message: 'Phone number not registered. Please sign up first.' });
        }
        res.json(farmer);
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
// ─── GET /api/farmers/ — List all farmers ────────────────────────────
const listFarmers = async (req, res, next) => {
    try {
        const farmers = await Farmer_1.default.find().sort({ created_at: -1 });
        // Add a farms_count virtual (0 for now — will populate when Farm model exists)
        const result = farmers.map((f) => {
            const obj = f.toJSON();
            obj.farms_count = 0;
            return obj;
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.listFarmers = listFarmers;
// ─── GET /api/farmers/summary/ — Lightweight list ────────────────────
const farmerSummary = async (req, res, next) => {
    try {
        const farmers = await Farmer_1.default.find()
            .select('name phone district state')
            .sort({ name: 1 });
        res.json(farmers);
    }
    catch (err) {
        next(err);
    }
};
exports.farmerSummary = farmerSummary;
// ─── POST /api/farmers/ — Create farmer (Sign Up) ────────────────────
const createFarmer = async (req, res, next) => {
    try {
        const { name, phone, email, state, district, preferred_language, experience_years } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        // Check for duplicate phone
        const existing = await Farmer_1.default.findOne({ phone: phone.trim() });
        if (existing) {
            return res
                .status(409)
                .json({ message: 'A farmer with this phone number already exists. Please use the login page.' });
        }
        const farmer = await Farmer_1.default.create({
            name,
            phone: phone.trim(),
            email: email || '',
            state,
            district,
            preferred_language: preferred_language || 'English',
            experience_years: experience_years || 0,
        });
        res.status(201).json(farmer);
    }
    catch (err) {
        next(err);
    }
};
exports.createFarmer = createFarmer;
// ─── GET /api/farmers/:id/ — Get single farmer ──────────────────────
const getFarmer = async (req, res, next) => {
    try {
        const farmer = await Farmer_1.default.findById(req.params.id);
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        res.json(farmer);
    }
    catch (err) {
        next(err);
    }
};
exports.getFarmer = getFarmer;
// ─── PUT /api/farmers/:id/ — Update farmer ───────────────────────────
const updateFarmer = async (req, res, next) => {
    try {
        const allowedFields = [
            'name', 'phone', 'email', 'state', 'district',
            'preferred_language', 'experience_years',
        ];
        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });
        const farmer = await Farmer_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        res.json(farmer);
    }
    catch (err) {
        // Handle duplicate phone on update
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Phone number already in use' });
        }
        next(err);
    }
};
exports.updateFarmer = updateFarmer;
// ─── DELETE /api/farmers/:id/ — Delete farmer ────────────────────────
const deleteFarmer = async (req, res, next) => {
    try {
        const farmer = await Farmer_1.default.findByIdAndDelete(req.params.id);
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        res.json({ message: 'Farmer deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteFarmer = deleteFarmer;
// ─── GET /api/farmers/:id/dashboard/ — Dashboard data ────────────────
const getFarmerDashboard = async (req, res, next) => {
    try {
        const farmer = await Farmer_1.default.findById(req.params.id);
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        // Return dashboard structure matching frontend expectations
        // Farms, activities, and reminders will be populated when those models exist
        res.json({
            farmer: farmer.toJSON(),
            stats: {
                total_farms: 0,
                total_acres: 0,
                activities_this_month: 0,
            },
            farms: [],
            recent_activities: [],
            upcoming_reminders: [],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getFarmerDashboard = getFarmerDashboard;
