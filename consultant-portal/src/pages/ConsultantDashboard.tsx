import React, { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import VideoCall from '../components/VideoCall';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || '';

interface ConsultantData {
  _id: string; name: string; email: string; phone: string;
  designation: string; department: string; specialization: string;
  state: string; district: string; experience_years: number;
  languages: string; available_hours: string; consultation_fee: string;
  is_available: boolean; is_online: boolean; rating: number;
}

export default function ConsultantDashboard() {
  const [consultant, setConsultant] = useState<ConsultantData | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Incoming call
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string; callerName: string; callerSocketId: string;
  } | null>(null);

  // Active video call
  const [activeCall, setActiveCall] = useState<{
    roomId: string; callerName: string;
  } | null>(null);

  // Stats
  const [totalCalls, setTotalCalls] = useState(0);

  // Pending call requests (polled from backend)
  const [pendingCallRequests, setPendingCallRequests] = useState<{
    roomId: string; consultantId: string; farmerName: string; createdAt: number;
  }[]>([]);

  // Load session
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('consultant_session') || 'null');
      if (!session || !session._id) {
        window.location.hash = '#/login';
        return;
      }
      setConsultant(session);
    } catch {
      window.location.hash = '#/login';
    }
  }, []);

  // Connect socket when going online
  useEffect(() => {
    if (!consultant || !isOnline) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Dashboard socket connected:', socket.id);
      socket.emit('consultant-online', { consultantId: consultant._id });
    });

    socket.on('incoming-call', (data: { roomId: string; callerName: string; callerSocketId: string }) => {
      console.log('📞 Incoming call:', data);
      setIncomingCall(data);
      // Play ring sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1iYWBdW19fYGBhYl9fXGBiZGFdXF5gYWBfX2BhYl9eXmBhYV9fX2BhYWBfX2BgYGBfYGBgYF9fYGBgYGBfYGBgYGBfYGBg'); 
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [consultant, isOnline]);

  const toggleOnline = useCallback(async () => {
    if (!consultant) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (!newStatus && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      await apiFetch(`/api/consultants/${consultant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newStatus, is_online: newStatus }),
      });
    } catch (e) { console.error('Toggle online error:', e); }
  }, [consultant, isOnline]);

  const acceptCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('call-accepted', {
      roomId: incomingCall.roomId,
      callerSocketId: incomingCall.callerSocketId,
    });
    setActiveCall({ roomId: incomingCall.roomId, callerName: incomingCall.callerName });
    setIncomingCall(null);
    setTotalCalls(prev => prev + 1);
  };

  const rejectCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('call-rejected', {
      callerSocketId: incomingCall.callerSocketId,
      reason: 'Consultant is busy',
    });
    setIncomingCall(null);
  };

  const endVideoCall = () => {
    setActiveCall(null);
  };

  const logout = async () => {
    if (consultant) {
      try {
        await apiFetch(`/api/consultants/${consultant._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_available: false, is_online: false }),
        });
      } catch (e) {
        console.error('Failed to set offline on logout:', e);
      }
    }
    if (socketRef.current) socketRef.current.disconnect();
    localStorage.removeItem('consultant_session');
    window.location.hash = '#/login';
  };

  // ── Poll for pending call requests from mobile app ────────────────
  useEffect(() => {
    if (!consultant) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await apiFetch(`/api/call-requests/${consultant._id}`);
        const data = await res.json();
        if (active && data.success) {
          setPendingCallRequests(data.data || []);
        }
      } catch (e) { /* ignore polling errors */ }
    };

    poll(); // initial fetch
    const interval = setInterval(poll, 3000); // poll every 3s

    return () => { active = false; clearInterval(interval); };
  }, [consultant]);

  const acceptCallRequest = async (call: { roomId: string; farmerName: string }) => {
    console.log('✅ Accepting call request:', call);
    // Remove from queue
    try {
      await apiFetch(`/api/call-requests/${call.roomId}`, { method: 'DELETE' });
    } catch (e) { console.error('Error deleting call request:', e); }
    setPendingCallRequests(prev => prev.filter(c => c.roomId !== call.roomId));
    setActiveCall({ roomId: call.roomId, callerName: call.farmerName });
    setTotalCalls(prev => prev + 1);
  };

  useEffect(() => {
    console.log('📱 activeCall status changed:', activeCall);
  }, [activeCall]);

  const dismissCallRequest = async (roomId: string) => {
    try {
      await apiFetch(`/api/call-requests/${roomId}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    setPendingCallRequests(prev => prev.filter(c => c.roomId !== roomId));
  };

  if (!consultant) return null;

  // If in active video call, show full-screen modal overlay (handled below)

  return (
    <div style={styles.pageWrap}>
      {/* Active Call Overlay */}
      {activeCall && (
        <div style={styles.activeCallOverlay}>
          <div style={styles.videoModalContainer}>
            <VideoCall
              roomId={activeCall.roomId}
              role="consultant"
              callerName={activeCall.callerName}
              onEnd={endVideoCall}
            />
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div style={styles.callOverlay}>
          <div style={styles.callModal}>
            <div style={styles.callPulse} />
            <div style={{ fontSize: 56, marginBottom: 16 }}>📞</div>
            <h2 style={styles.callTitle}>Incoming Call</h2>
            <p style={styles.callName}>{incomingCall.callerName || 'A Farmer'}</p>
            <p style={styles.callSub}>wants to video call you</p>
            <div style={styles.callActions}>
              <button onClick={rejectCall} style={styles.rejectBtn}>
                ❌ Reject
              </button>
              <button onClick={acceptCall} style={styles.acceptBtn}>
                📹 Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <div style={styles.topLogo}>🌾</div>
          <div>
            <div style={styles.topBrand}>Cognitia</div>
            <div style={styles.topSub}>Consultant Dashboard</div>
          </div>
        </div>
        <div style={styles.topBarRight}>
          <button onClick={toggleOnline} style={{
            ...styles.onlineToggle,
            background: isOnline
              ? 'linear-gradient(135deg, #48bb78, #38a169)'
              : 'linear-gradient(135deg, #a0aec0, #718096)',
          }}>
            {isOnline ? '🟢 Online' : '⚪ Offline'}
          </button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.profileHeader}>
            <div style={styles.avatar}>
              {consultant.name.charAt(0)}
            </div>
            <div style={styles.profileInfo}>
              <h1 style={styles.profileName}>{consultant.name}</h1>
              <p style={styles.profileDesignation}>{consultant.designation}</p>
              <p style={styles.profileSpec}>{consultant.specialization}</p>
            </div>
            <div style={{
              ...styles.statusBadge,
              background: isOnline ? '#f0fff4' : '#f7fafc',
              color: isOnline ? '#22543d' : '#718096',
              borderColor: isOnline ? '#c6f6d5' : '#e2e8f0',
            }}>
              {isOnline ? '🟢 Online — Ready for calls' : '⚪ Offline'}
            </div>
          </div>

          {/* Info grid */}
          <div style={styles.infoGrid}>
            {[
              { icon: '📧', label: 'Email', value: consultant.email },
              { icon: '📱', label: 'Phone', value: consultant.phone },
              { icon: '📍', label: 'Location', value: `${consultant.district || ''} ${consultant.state}`.trim() },
              { icon: '🏢', label: 'Department', value: consultant.department || 'Independent' },
              { icon: '💼', label: 'Experience', value: `${consultant.experience_years} years` },
              { icon: '🗣', label: 'Languages', value: consultant.languages },
              { icon: '⏰', label: 'Hours', value: consultant.available_hours },
              { icon: '💰', label: 'Fee', value: consultant.consultation_fee },
            ].map((item, i) => (
              <div key={i} style={styles.infoItem}>
                <span style={styles.infoIcon}>{item.icon}</span>
                <div>
                  <div style={styles.infoLabel}>{item.label}</div>
                  <div style={styles.infoValue}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Incoming Video Calls Section ────────────────────────── */}
        {pendingCallRequests.length > 0 && (
          <div style={styles.incomingCallsCard}>
            <h3 style={styles.incomingCallsTitle}>📞 Incoming Video Calls</h3>
            <p style={styles.incomingCallsSub}>A farmer is waiting to connect with you</p>
            {pendingCallRequests.map((call) => {
              const elapsed = Math.floor((Date.now() - call.createdAt) / 1000);
              return (
                <div key={call.roomId} style={styles.callRequestCard}>
                  <div style={styles.callRequestPulse} />
                  <div style={styles.callRequestInfo}>
                    <div style={styles.callRequestAvatar}>📹</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.callRequestName}>{call.farmerName}</div>
                      <div style={styles.callRequestMeta}>Video Call Request • {elapsed}s ago</div>
                    </div>
                  </div>
                  <div style={styles.callRequestActions}>
                    <button onClick={() => dismissCallRequest(call.roomId)} style={styles.callRequestRejectBtn}>
                      ❌ Decline
                    </button>
                    <button onClick={() => acceptCallRequest(call)} style={styles.callRequestAcceptBtn}>
                      📹 Accept Video Call
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── No Active Calls Placeholder ─────────────────────────── */}
        {pendingCallRequests.length === 0 && (
          <div style={styles.waitingCard}>
            <div style={styles.waitingIcon}>📱</div>
            <h3 style={styles.waitingTitle}>Waiting for Calls</h3>
            <p style={styles.waitingText}>
              When a farmer taps "Video Call" on the mobile app, the call will appear here.
              Make sure your status is <strong>Online</strong> so farmers can see you.
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📹</div>
            <div style={styles.statValue}>{totalCalls}</div>
            <div style={styles.statLabel}>Calls Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>
            <div style={styles.statValue}>{consultant.rating || 4.0}</div>
            <div style={styles.statLabel}>Rating</div>
          </div>
          <div style={{
            ...styles.statCard,
            background: isOnline
              ? 'linear-gradient(135deg, #f0fff4, #e6fffa)'
              : 'linear-gradient(135deg, #f7fafc, #edf2f7)',
          }}>
            <div style={styles.statIcon}>{isOnline ? '🟢' : '⚪'}</div>
            <div style={styles.statValue}>{isOnline ? 'Active' : 'Idle'}</div>
            <div style={styles.statLabel}>Status</div>
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructionCard}>
          <h3 style={styles.instructionTitle}>📋 How Video Calling Works</h3>
          <div style={styles.steps}>
            {[
              { step: '1', text: 'Toggle your status to "Online" using the button above' },
              { step: '2', text: 'Farmers will see you as available on the mobile app' },
              { step: '3', text: 'When a farmer taps Video Call, it appears in the section above' },
              { step: '4', text: 'Click "Accept Video Call" to start a live consultation' },
            ].map((s, i) => (
              <div key={i} style={styles.stepItem}>
                <div style={styles.stepNum}>{s.step}</div>
                <span style={styles.stepText}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ringPulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: '100vh', background: '#f0f4f0',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  // Top bar
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', background: 'linear-gradient(135deg, #0f4c3a, #1a6b4f)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  activeCallOverlay: {
    position: 'fixed' as const, inset: 0, zIndex: 10000,
    background: 'rgba(15, 12, 41, 0.95)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
  },
  videoModalContainer: {
    width: '100%', maxWidth: '1200px', height: '100%', maxHeight: '800px',
    background: '#000', borderRadius: '24px', overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
    animation: 'slideUp 0.4s ease-out',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  topLogo: {
    width: 44, height: 44, borderRadius: 12,
    background: 'rgba(255,255,255,0.2)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 24,
  },
  topBrand: { color: '#fff', fontSize: 20, fontWeight: 800 },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  onlineToggle: {
    padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
    color: '#fff', fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  },
  logoutBtn: {
    padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  content: {
    maxWidth: 900, margin: '0 auto', padding: '32px 24px',
  },
  // Profile card
  profileCard: {
    background: '#fff', borderRadius: 24, padding: 32,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 24,
    animation: 'slideUp 0.5s ease-out',
  },
  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
    flexWrap: 'wrap' as const,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    background: 'linear-gradient(135deg, #0f4c3a, #2d8f69)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 800, color: '#fff',
    boxShadow: '0 8px 25px rgba(15,76,58,0.3)',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 26, fontWeight: 800, color: '#1a202c', margin: '0 0 4px' },
  profileDesignation: { fontSize: 15, fontWeight: 600, color: '#0f4c3a', margin: 0 },
  profileSpec: { fontSize: 13, color: '#718096', margin: '4px 0 0', fontWeight: 500 },
  statusBadge: {
    padding: '10px 20px', borderRadius: 14, fontSize: 14, fontWeight: 700,
    border: '2px solid',
  },
  infoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  infoItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', background: '#f7fafc', borderRadius: 14,
  },
  infoIcon: { fontSize: 18 },
  infoLabel: { fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' as const },
  infoValue: { fontSize: 14, color: '#1a202c', fontWeight: 600 },
  // Stats
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff', borderRadius: 20, padding: '28px 24px',
    textAlign: 'center' as const, boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    animation: 'slideUp 0.6s ease-out',
  },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 800, color: '#1a202c' },
  statLabel: { fontSize: 13, color: '#a0aec0', fontWeight: 600, marginTop: 4 },
  // Instructions
  instructionCard: {
    background: '#fff', borderRadius: 24, padding: 32,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    animation: 'slideUp 0.7s ease-out',
  },
  instructionTitle: { fontSize: 18, fontWeight: 700, color: '#1a202c', margin: '0 0 20px' },
  steps: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  stepItem: { display: 'flex', alignItems: 'center', gap: 16 },
  stepNum: {
    width: 36, height: 36, borderRadius: 12,
    background: 'linear-gradient(135deg, #0f4c3a, #2d8f69)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
  },
  stepText: { fontSize: 14, color: '#4a5568', fontWeight: 500, lineHeight: 1.5 },
  // Incoming call modal
  callOverlay: {
    position: 'fixed' as const, inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  callModal: {
    background: '#fff', borderRadius: 28, padding: '48px 40px',
    textAlign: 'center' as const, maxWidth: 400, width: '90%',
    position: 'relative' as const, overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.4s ease-out',
  },
  callPulse: {
    position: 'absolute' as const, top: '50%', left: '50%',
    width: 100, height: 100, borderRadius: '50%',
    background: 'rgba(72,187,120,0.2)',
    transform: 'translate(-50%, -50%)',
    animation: 'ringPulse 1.5s ease-out infinite',
  },
  callTitle: {
    fontSize: 24, fontWeight: 800, color: '#1a202c', margin: '0 0 8px',
    position: 'relative' as const, zIndex: 1,
  },
  callName: {
    fontSize: 20, fontWeight: 700, color: '#0f4c3a', margin: '0 0 4px',
    position: 'relative' as const, zIndex: 1,
  },
  callSub: {
    fontSize: 14, color: '#718096', margin: '0 0 28px',
    position: 'relative' as const, zIndex: 1,
  },
  callActions: {
    display: 'flex', gap: 16, justifyContent: 'center',
    position: 'relative' as const, zIndex: 1,
  },
  rejectBtn: {
    padding: '14px 32px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #e53e3e, #c53030)', color: '#fff',
    fontSize: 16, fontWeight: 700, boxShadow: '0 6px 20px rgba(229,62,62,0.3)',
  },
  acceptBtn: {
    padding: '14px 32px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #48bb78, #38a169)', color: '#fff',
    fontSize: 16, fontWeight: 700, boxShadow: '0 6px 20px rgba(72,187,120,0.3)',
    animation: 'shake 0.8s ease-in-out infinite',
  },
  // ── Incoming Calls Section ──
  incomingCallsCard: {
    background: 'linear-gradient(135deg, #fff5f5, #fff)', borderRadius: 24, padding: 32,
    boxShadow: '0 4px 30px rgba(229,62,62,0.12)', marginBottom: 24,
    border: '2px solid #fed7d7', animation: 'slideUp 0.5s ease-out',
  },
  incomingCallsTitle: { fontSize: 20, fontWeight: 800, color: '#c53030', margin: '0 0 4px' },
  incomingCallsSub: { fontSize: 14, color: '#e53e3e', margin: '0 0 20px', fontWeight: 500 },
  callRequestCard: {
    background: '#fff', borderRadius: 20, padding: 24, position: 'relative' as const,
    border: '2px solid #fc8181', overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(229,62,62,0.1)', marginBottom: 12,
  },
  callRequestPulse: {
    position: 'absolute' as const, top: 12, right: 12,
    width: 12, height: 12, borderRadius: '50%', background: '#48bb78',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  callRequestInfo: {
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
  },
  callRequestAvatar: {
    width: 56, height: 56, borderRadius: 16,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, boxShadow: '0 4px 15px rgba(102,126,234,0.3)',
  },
  callRequestName: { fontSize: 20, fontWeight: 800, color: '#1a202c' },
  callRequestMeta: { fontSize: 13, color: '#718096', fontWeight: 500, marginTop: 4 },
  callRequestActions: {
    display: 'flex', gap: 12,
  },
  callRequestRejectBtn: {
    flex: 1, padding: '14px 24px', borderRadius: 14, cursor: 'pointer',
    background: '#fff', color: '#e53e3e', fontSize: 15, fontWeight: 700,
    border: '2px solid #fed7d7', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
  },
  callRequestAcceptBtn: {
    flex: 2, padding: '14px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #48bb78, #38a169)', color: '#fff',
    fontSize: 15, fontWeight: 700, boxShadow: '0 6px 20px rgba(72,187,120,0.3)',
    animation: 'shake 0.8s ease-in-out infinite', transition: 'all 0.2s',
  },
  // ── Waiting Card ──
  waitingCard: {
    background: '#fff', borderRadius: 24, padding: '40px 32px',
    textAlign: 'center' as const, boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    marginBottom: 24, border: '2px dashed #e2e8f0',
    animation: 'slideUp 0.5s ease-out',
  },
  waitingIcon: { fontSize: 48, marginBottom: 12 },
  waitingTitle: { fontSize: 18, fontWeight: 700, color: '#4a5568', margin: '0 0 8px' },
  waitingText: { fontSize: 14, color: '#a0aec0', lineHeight: 1.6, margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' },
};
