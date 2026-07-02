import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
];

const SPECIALIZATIONS = [
  'Crop Production & Management','Soil Health & Fertility','Plant Protection & Pest Management',
  'Horticulture Development','Organic Farming','Water Management & Irrigation',
  'Post-Harvest Technology','Agricultural Marketing','Farm Mechanization',
  'Seed Quality & Certification','Dairy & Animal Husbandry','Fisheries & Aquaculture',
  'Agronomy & Crop Science','Agricultural Biotechnology','Entomology',
];

const DESIGNATIONS = [
  'Agricultural Consultant','Senior Agricultural Advisor','Crop Specialist',
  'Soil Scientist','Plant Pathologist','Horticulture Expert','Organic Farming Consultant',
  'Irrigation Specialist','Agricultural Economist','Veterinary Consultant',
  'Fisheries Expert','Farm Mechanization Expert',
];

export default function ConsultantSignup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    designation: '', department: '', specialization: '', state: '', district: '',
    office_address: '', experience_years: '', languages: 'Hindi, English',
    available_hours: '10:00 AM - 5:00 PM', consultation_fee: 'Free',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { confirmPassword, ...payload } = form;
      const res = await apiFetch('/api/consultants/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          experience_years: parseInt(payload.experience_years) || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.successCard}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
          <h1 style={styles.successTitle}>Registration Successful!</h1>
          <p style={styles.successText}>
            Your consultant account has been created. You can now login to your dashboard.
          </p>
          <button
            onClick={() => window.location.hash = '#/login'}
            style={styles.successBtn}
          >
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      {/* Background decoration */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.logo}>🌾</div>
            <div>
              <h1 style={styles.brandTitle}>Cognitia</h1>
              <p style={styles.brandSub}>Agricultural Consultant Portal</p>
            </div>
          </div>
          <h2 style={styles.formTitle}>Sign Up as Consultant</h2>
          <p style={styles.formSubtitle}>
            Join our network of agricultural experts and help farmers across India
          </p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={submit} style={styles.form}>
          {/* Personal Info Section */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>👤</span>
            <span style={styles.sectionLabel}>Personal Information</span>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                placeholder="Dr. Rajesh Kumar" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone *</label>
              <input name="phone" value={form.phone} onChange={handleChange} required
                placeholder="+91 98765 43210" style={styles.input} />
            </div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                placeholder="rajesh@example.com" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Languages</label>
              <input name="languages" value={form.languages} onChange={handleChange}
                placeholder="Hindi, English, Tamil" style={styles.input} />
            </div>
          </div>

          {/* Password Section */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🔒</span>
            <span style={styles.sectionLabel}>Set Password</span>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required
                placeholder="Min 6 characters" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm Password *</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                placeholder="Re-enter password" style={styles.input} />
            </div>
          </div>

          {/* Professional Info Section */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🎓</span>
            <span style={styles.sectionLabel}>Professional Details</span>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Designation *</label>
              <select name="designation" value={form.designation} onChange={handleChange} required style={styles.input}>
                <option value="">Select designation</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Specialization *</label>
              <select name="specialization" value={form.specialization} onChange={handleChange} required style={styles.input}>
                <option value="">Select specialization</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <input name="department" value={form.department} onChange={handleChange}
                placeholder="e.g., ICAR, KVK, University" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Experience (Years)</label>
              <input name="experience_years" type="number" min="0" value={form.experience_years} onChange={handleChange}
                placeholder="e.g., 10" style={styles.input} />
            </div>
          </div>

          {/* Location Section */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📍</span>
            <span style={styles.sectionLabel}>Location</span>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>State *</label>
              <select name="state" value={form.state} onChange={handleChange} required style={styles.input}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>District</label>
              <input name="district" value={form.district} onChange={handleChange}
                placeholder="e.g., Lucknow" style={styles.input} />
            </div>
          </div>

          {/* Availability Section */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⏰</span>
            <span style={styles.sectionLabel}>Availability & Fees</span>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Available Hours</label>
              <input name="available_hours" value={form.available_hours} onChange={handleChange}
                placeholder="10:00 AM - 5:00 PM" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Consultation Fee</label>
              <select name="consultation_fee" value={form.consultation_fee} onChange={handleChange} style={styles.input}>
                <option value="Free">Free</option>
                <option value="₹100">₹100</option>
                <option value="₹200">₹200</option>
                <option value="₹500">₹500</option>
                <option value="₹1000">₹1000</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            ...styles.submitBtn,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '⏳ Creating Account...' : '🚀 Create Consultant Account'}
          </button>

          <p style={styles.loginLink}>
            Already have an account?{' '}
            <a href="#/login" style={styles.link}>Login here</a>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f4c3a 0%, #1a6b4f 30%, #0d3d2e 70%, #0a2b20 100%)',
    padding: '40px 20px', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  bgOrb1: {
    position: 'absolute', top: -120, right: -120, width: 400, height: 400,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(72,187,120,0.15), transparent)',
    animation: 'float 8s ease-in-out infinite',
  },
  bgOrb2: {
    position: 'absolute', bottom: -100, left: -150, width: 500, height: 500,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,178,172,0.1), transparent)',
    animation: 'float 10s ease-in-out infinite 2s',
  },
  container: {
    width: '100%', maxWidth: 720, background: 'rgba(255,255,255,0.97)',
    borderRadius: 28, overflow: 'hidden', position: 'relative', zIndex: 1,
    boxShadow: '0 25px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
    animation: 'slideUp 0.6s ease-out',
  },
  header: {
    background: 'linear-gradient(135deg, #0f4c3a, #1a6b4f, #2d8f69)',
    padding: '36px 40px', color: '#fff',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  logo: {
    width: 52, height: 52, borderRadius: 16,
    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
    border: '1px solid rgba(255,255,255,0.3)',
  },
  brandTitle: { fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 },
  brandSub: { fontSize: 13, opacity: 0.8, margin: 0, fontWeight: 500 },
  formTitle: { fontSize: 28, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 },
  formSubtitle: { fontSize: 15, opacity: 0.85, margin: 0, fontWeight: 400, lineHeight: 1.5 },
  errorBanner: {
    margin: '0 24px', marginTop: 16, padding: '12px 16px', borderRadius: 12,
    background: '#fff5f5', color: '#e53e3e', fontSize: 14, fontWeight: 600,
    border: '1px solid #fed7d7', display: 'flex', alignItems: 'center', gap: 8,
  },
  form: { padding: '24px 40px 36px' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16,
    paddingBottom: 8, borderBottom: '2px solid #e2e8f0',
  },
  sectionIcon: { fontSize: 20 },
  sectionLabel: { fontSize: 16, fontWeight: 700, color: '#1a202c' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '2px solid #e2e8f0', fontSize: 14, fontWeight: 500,
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    background: '#f7fafc', color: '#1a202c', boxSizing: 'border-box' as const,
  },
  submitBtn: {
    width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #0f4c3a, #1a6b4f)', color: '#fff',
    fontSize: 17, fontWeight: 700, marginTop: 24,
    boxShadow: '0 8px 30px rgba(15,76,58,0.3)',
    transition: 'all 0.2s',
  },
  loginLink: { textAlign: 'center' as const, marginTop: 20, fontSize: 14, color: '#718096' },
  link: { color: '#0f4c3a', fontWeight: 700, textDecoration: 'none' },
  successCard: {
    background: 'rgba(255,255,255,0.97)', borderRadius: 28, padding: '60px 50px',
    textAlign: 'center' as const, maxWidth: 500, zIndex: 1, position: 'relative' as const,
    boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
    animation: 'slideUp 0.6s ease-out',
  },
  successTitle: { fontSize: 28, fontWeight: 800, color: '#1a202c', margin: '0 0 12px' },
  successText: { fontSize: 16, color: '#718096', lineHeight: 1.6, margin: '0 0 30px' },
  successBtn: {
    padding: '14px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #0f4c3a, #1a6b4f)', color: '#fff',
    fontSize: 16, fontWeight: 700, boxShadow: '0 8px 30px rgba(15,76,58,0.3)',
  },
};
