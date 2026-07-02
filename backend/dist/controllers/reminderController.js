"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReminder = exports.markCompleted = exports.createReminder = exports.listReminders = void 0;
const Reminder_1 = __importDefault(require("../models/Reminder"));
// ─── GET /api/reminders/ — List reminders (with filters) ────────────
const listReminders = async (req, res, next) => {
    try {
        const filter = {};
        const farmerId = req.query.farmer_id || req.query.farmer;
        if (farmerId)
            filter.farmer = farmerId;
        if (req.query.category)
            filter.category = req.query.category;
        if (req.query.priority)
            filter.priority = req.query.priority;
        if (req.query.is_completed !== undefined && req.query.is_completed !== '') {
            filter.is_completed = req.query.is_completed === 'true';
        }
        const limit = parseInt(req.query.limit) || 100;
        const reminders = await Reminder_1.default.find(filter)
            .populate('farmer', 'name phone district state')
            .populate('farm', 'name')
            .sort({ due_date: 1 })
            .limit(limit);
        const result = reminders.map((r) => {
            const obj = r.toJSON();
            obj.farmer_name = r.farmer?.name || 'Unknown';
            obj.farm_name = r.farm?.name || 'Unknown Farm';
            return obj;
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.listReminders = listReminders;
// ─── POST /api/reminders/ — Create reminder ─────────────────────────
const createReminder = async (req, res, next) => {
    try {
        const { farmer, farm, title, description, due_date, category, priority } = req.body;
        if (!farmer) {
            return res.status(400).json({ message: 'Farmer ID is required' });
        }
        if (!farm) {
            return res.status(400).json({ message: 'Farm ID is required' });
        }
        const reminder = await Reminder_1.default.create({
            farmer,
            farm,
            title,
            description: description || '',
            due_date: new Date(due_date),
            category: category || 'general',
            priority: priority || 'medium',
        });
        await reminder.populate('farmer', 'name phone district state');
        await reminder.populate('farm', 'name');
        const result = reminder.toJSON();
        result.farmer_name = reminder.farmer?.name || 'Unknown';
        result.farm_name = reminder.farm?.name || 'Unknown Farm';
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.createReminder = createReminder;
// ─── POST /api/reminders/:id/mark_completed/ — Toggle completion ────
const markCompleted = async (req, res, next) => {
    try {
        const reminder = await Reminder_1.default.findById(req.params.id);
        if (!reminder) {
            return res.status(404).json({ message: 'Reminder not found' });
        }
        const updated = await Reminder_1.default.findByIdAndUpdate(req.params.id, { is_completed: !reminder.is_completed }, { new: true })
            .populate('farmer', 'name phone district state')
            .populate('farm', 'name');
        if (!updated) {
            return res.status(404).json({ message: 'Reminder not found' });
        }
        const result = updated.toJSON();
        result.farmer_name = updated.farmer?.name || 'Unknown';
        result.farm_name = updated.farm?.name || 'Unknown Farm';
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.markCompleted = markCompleted;
// ─── DELETE /api/reminders/:id/ — Delete reminder ────────────────────
const deleteReminder = async (req, res, next) => {
    try {
        const reminder = await Reminder_1.default.findByIdAndDelete(req.params.id);
        if (!reminder) {
            return res.status(404).json({ message: 'Reminder not found' });
        }
        res.json({ message: 'Reminder deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteReminder = deleteReminder;
