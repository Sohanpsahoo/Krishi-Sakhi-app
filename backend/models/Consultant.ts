import mongoose, { Document, Schema } from 'mongoose';

export interface IConsultant extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  designation: string;
  department?: string;
  specialization: string;
  state: string;
  district: string;
  office_address?: string;
  available_hours?: string;
  experience_years?: number;
  languages?: string;
  rating?: number;
  is_available?: boolean;
  consultation_fee?: string;
  photo_url?: string;
  is_online?: boolean;
  socket_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const consultantSchema: Schema = new Schema<IConsultant>({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  password:          { type: String, required: true },
  phone:             { type: String, required: true },
  designation:       { type: String, required: true },
  department:        { type: String, default: 'Independent Consultant' },
  specialization:    { type: String, required: true },
  state:             { type: String, required: true, index: true },
  district:          { type: String, default: '' },
  office_address:    { type: String, default: '' },
  available_hours:   { type: String, default: '10:00 AM - 5:00 PM' },
  experience_years:  { type: Number, default: 1 },
  languages:         { type: String, default: 'Hindi, English' },
  rating:            { type: Number, default: 4.0, min: 1, max: 5 },
  is_available:      { type: Boolean, default: true },
  consultation_fee:  { type: String, default: 'Free' },
  photo_url:         { type: String, default: '' },
  is_online:         { type: Boolean, default: false },
  socket_id:         { type: String, default: '' },
}, { timestamps: true });

consultantSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
consultantSchema.set('toJSON', { virtuals: true });
consultantSchema.set('toObject', { virtuals: true });

export default mongoose.model<IConsultant>('Consultant', consultantSchema);
