import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

export default function ConsultantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/consultants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('consultant_session', JSON.stringify(data.data));
        window.location.hash = '#/dashboard';
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.logo}>🌾</div>
            <div>
              <h1 style={styles.brandTitle}>Cognitia</h1>
              <p style={styles.brandSub}>Consultant Portal</p>
            </div>
          </div>
          <h2 style={styles.formTitle}>Welcome Back</h2>
          <p style={styles.formSubtitle}>Sign in to your consultant dashboard</p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>📧</span>
              <input
                type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com" required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type="password" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password" required
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            ...styles.submitBtn,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          <p style={styles.signupLink}>
            Don't have an account?{' '}
            <a href="#/signup" style={styles.link}>Register as Consultant</a>
          </p>

          <p style={styles.farmerLink}>
            <a href="#/" style={styles.linkSecondary}>← Back to Farmer Portal</a>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
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
  card: {
    width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.97)',
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
  formSubtitle: { fontSize: 15, opacity: 0.85, margin: 0, fontWeight: 400 },
  errorBanner: {
    margin: '0 24px', marginTop: 16, padding: '12px 16px', borderRadius: 12,
    background: '#fff5f5', color: '#e53e3e', fontSize: 14, fontWeight: 600,
    border: '1px solid #fed7d7', display: 'flex', alignItems: 'center', gap: 8,
  },
  form: { padding: '32px 40px 36px' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 8 },
  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 14, fontSize: 16, zIndex: 1,
  },
  input: {
    width: '100%', padding: '13px 14px 13px 44px', borderRadius: 14,
    border: '2px solid #e2e8f0', fontSize: 15, fontWeight: 500,
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    background: '#f7fafc', color: '#1a202c', boxSizing: 'border-box' as const,
  },
  submitBtn: {
    width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #0f4c3a, #1a6b4f)', color: '#fff',
    fontSize: 17, fontWeight: 700, marginTop: 8,
    boxShadow: '0 8px 30px rgba(15,76,58,0.3)',
    transition: 'all 0.2s',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0',
  },
  dividerLine: { flex: 1, height: 1, background: '#e2e8f0' },
  dividerText: { fontSize: 13, color: '#a0aec0', fontWeight: 500 },
  signupLink: { textAlign: 'center' as const, fontSize: 14, color: '#718096', margin: 0 },
  link: { color: '#0f4c3a', fontWeight: 700, textDecoration: 'none' },
  farmerLink: { textAlign: 'center' as const, marginTop: 16, fontSize: 13 },
  linkSecondary: { color: '#a0aec0', textDecoration: 'none', fontWeight: 500 },
};
