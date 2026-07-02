import { Request, Response, NextFunction } from 'express';
import Farmer from '../models/Farmer';
import Farm from '../models/Farm';
import Activity from '../models/Activity';
import Reminder from '../models/Reminder';

// ─── POST /api/farmers/login/ — Sign In by phone ────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const farmer = await Farmer.findOne({ phone: phone.trim() });

    if (!farmer) {
      return res
        .status(404)
        .json({ message: 'Phone number not registered. Please sign up first.' });
    }

    res.json(farmer);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/farmers/ — List all farmers ────────────────────────────
export const listFarmers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farmers = await Farmer.find().sort({ created_at: -1 });

    // Add a farms_count virtual (0 for now — will populate when Farm model exists)
    const result = farmers.map((f) => {
      const obj = f.toJSON() as any;
      obj.farms_count = 0;
      return obj;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/farmers/summary/ — Lightweight list ────────────────────
export const farmerSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farmers = await Farmer.find()
      .select('name phone district state')
      .sort({ name: 1 });

    res.json(farmers);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/farmers/ — Create farmer (Sign Up) ────────────────────
export const createFarmer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, state, district, preferred_language, experience_years } =
      req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check for duplicate phone
    const existing = await Farmer.findOne({ phone: phone.trim() });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'A farmer with this phone number already exists. Please use the login page.' });
    }

    const farmer = await Farmer.create({
      name,
      phone: phone.trim(),
      email: email || '',
      state,
      district,
      preferred_language: preferred_language || 'English',
      experience_years: experience_years || 0,
    });

    res.status(201).json(farmer);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/farmers/:id/ — Get single farmer ──────────────────────
export const getFarmer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json(farmer);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/farmers/:id/ — Update farmer ───────────────────────────
export const updateFarmer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowedFields = [
      'name', 'phone', 'email', 'state', 'district',
      'preferred_language', 'experience_years',
    ];

    const updates: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const farmer = await Farmer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json(farmer);
  } catch (err: any) {
    // Handle duplicate phone on update
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Phone number already in use' });
    }
    next(err);
  }
};

// ─── DELETE /api/farmers/:id/ — Delete farmer ────────────────────────
export const deleteFarmer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farmer = await Farmer.findByIdAndDelete(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json({ message: 'Farmer deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/farmers/:id/dashboard/ — Dashboard data ────────────────
export const getFarmerDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const farms = await Farm.find({ farmer_id: req.params.id }).lean();
    
    let total_acres = 0;
    farms.forEach((f: any) => {
      total_acres += Number(f.area_acres) || 0;
    });

    const recent_activities = await Activity.find({ farmer_id: req.params.id })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const upcoming_reminders = await Reminder.find({ farmer_id: req.params.id })
      .sort({ date: 1 })
      .limit(5)
      .lean();

    const activities_this_month = await Activity.countDocuments({
      farmer_id: req.params.id,
      date: { $gte: new Date(new Date().setDate(1)) }
    });

    res.json({
      farmer: farmer.toJSON(),
      stats: {
        total_farms: farms.length,
        total_acres,
        activities_this_month,
      },
      farms,
      recent_activities,
      upcoming_reminders,
    });
  } catch (err) {
    next(err);
  }
};
