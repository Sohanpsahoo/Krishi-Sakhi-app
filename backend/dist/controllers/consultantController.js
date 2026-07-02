"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConsultant = exports.getConsultant = exports.listConsultants = exports.loginConsultant = exports.registerConsultant = void 0;
const Consultant_1 = __importDefault(require("../models/Consultant"));
const crypto_1 = __importDefault(require("crypto"));
// Simple password hashing (no bcrypt dependency needed)
function hashPassword(password) {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
}
// ─── 1) Register consultant ────────────────────────────────────────
const registerConsultant = async (req, res) => {
    try {
        const { name, email, password, phone, designation, department, specialization, state, district, office_address, available_hours, experience_years, languages, consultation_fee } = req.body;
        if (!name || !email || !password || !phone || !specialization || !state || !designation) {
            return res.status(400).json({
                success: false,
                message: 'Required: name, email, password, phone, designation, specialization, state'
            });
        }
        // Check duplicate
        const existing = await Consultant_1.default.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }
        const consultant = await Consultant_1.default.create({
            name, email,
            password: hashPassword(password),
            phone, designation,
            department: department || 'Independent Consultant',
            specialization, state,
            district: district || '',
            office_address: office_address || '',
            available_hours: available_hours || '10:00 AM - 5:00 PM',
            experience_years: experience_years || 1,
            languages: languages || 'Hindi, English',
            consultation_fee: consultation_fee || 'Free',
        });
        console.log(`✅ Consultant registered: ${name} (${email})`);
        // Return without password
        const data = consultant.toJSON();
        delete data.password;
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        console.error('registerConsultant error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.registerConsultant = registerConsultant;
// ─── 2) Login consultant ───────────────────────────────────────────
const loginConsultant = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const consultant = await Consultant_1.default.findOne({ email });
        if (!consultant) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (consultant.password !== hashPassword(password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        // Return without password
        const data = consultant.toJSON();
        delete data.password;
        console.log(`✅ Consultant logged in: ${consultant.name}`);
        res.json({ success: true, data });
    }
    catch (error) {
        console.error('loginConsultant error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.loginConsultant = loginConsultant;
// ─── 3) List all consultants ───────────────────────────────────────
const listConsultants = async (req, res) => {
    try {
        const { state, specialization } = req.query;
        const query = {};
        if (state)
            query.state = state;
        if (specialization && specialization !== 'All')
            query.specialization = specialization;
        const consultants = await Consultant_1.default.find(query)
            .select('-password')
            .sort({ rating: -1 })
            .limit(50);
        res.json({ success: true, data: consultants });
    }
    catch (error) {
        console.error('listConsultants error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.listConsultants = listConsultants;
// ─── 4) Get single consultant ──────────────────────────────────────
const getConsultant = async (req, res) => {
    try {
        const consultant = await Consultant_1.default.findById(req.params.id).select('-password');
        if (!consultant)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: consultant });
    }
    catch (error) {
        console.error('getConsultant error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getConsultant = getConsultant;
// ─── 5) Update consultant profile ──────────────────────────────────
const updateConsultant = async (req, res) => {
    try {
        const updates = { ...req.body };
        delete updates.password; // Don't allow password change here
        delete updates.email; // Don't allow email change
        const consultant = await Consultant_1.default.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        if (!consultant)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: consultant });
    }
    catch (error) {
        console.error('updateConsultant error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateConsultant = updateConsultant;
