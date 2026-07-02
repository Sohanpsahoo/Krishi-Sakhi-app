import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface VideoCallProps {
  roomId: string;
  role: 'consultant' | 'farmer';
  onEnd?: () => void;
  callerName?: string;
}

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VideoCall({ roomId, onEnd }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<Socket | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isMountedRef = useRef(true);
  // Track whether user explicitly ended the call (vs component unmounting)
  const userEndedRef = useRef(false);

  const [callState, setCallState] = useState<string>('Initializing...');
  const [canReconnect, setCanReconnect] = useState(false);
  const [iceState, setIceState] = useState<string>('new');
  const [errorDetail, setErrorDetail] = useState<string>('');

  // Use relative path to leverage Vite proxy and avoid mixed content issues
  const BACKEND_URL = '';

  // ── Cleanup resources WITHOUT calling onEnd ────────────────────────
  const cleanupResources = useCallback(() => {
    if (peerConnection.current) {
      try { peerConnection.current.close(); } catch (e) { /* ignore */ }
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => { try { t.stop(); } catch (e) { /* ignore */ } });
      localStream.current = null;
    }
    if (socket.current) {
      try { socket.current.disconnect(); } catch (e) { /* ignore */ }
      socket.current = null;
    }
  }, []);

  // ── End call (user-initiated or remote-ended) ─────────────────────
  const endCall = useCallback((emit: boolean = true) => {
    console.log(`📵 endCall called (emit=${emit})`);
    if (emit && socket.current?.connected) {
      socket.current.emit('end-call', { roomId });
    }
    cleanupResources();
    userEndedRef.current = true;
    if (onEnd) onEnd();
  }, [roomId, onEnd, cleanupResources]);

  // ── Acquire local media (camera/mic or fallback) ──────────────────
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    setCallState('Requesting Camera/Mic...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('✅ Real camera acquired, tracks:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (err) {
      console.warn('⚠️ Hardware camera failed, using dummy fallback:', err);
      setCallState('Using dummy camera fallback...');

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      let angle = 0;
      const intervalId = setInterval(() => {
        if (!ctx) return;
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, 640, 480);
        ctx.save();
        ctx.translate(320, 240);
        ctx.rotate(angle);
        ctx.fillStyle = '#48bb78';
        ctx.fillRect(-100, -100, 200, 200);
        ctx.restore();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💻 CONSULTANT', 320, 260);
        angle += 0.05;
      }, 50);

      // Store interval for cleanup
      (window as any).__canvasInterval = intervalId;

      // @ts-ignore - captureStream exists on canvas
      const stream: MediaStream = canvas.captureStream(20);

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        const osc = actx.createOscillator();
        osc.frequency.value = 0; // silent
        osc.connect(dest);
        osc.start();
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      }
      return stream;
    }
  }, []);

  // ── Create peer connection ─────────────────────────────────────────
  const createPeerConnection = useCallback(async (isInitiator: boolean) => {
    if (peerConnection.current) {
      try { peerConnection.current.close(); } catch (e) { /* ignore */ }
    }
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnection.current = pc;
    console.log(`🔗 PeerConnection created (initiator=${isInitiator})`);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Remote track received:', event.track.kind);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('📺 Remote video stream attached');
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${state}`);
      if (!isMountedRef.current) return;
      setIceState(state);

      if (state === 'connected' || state === 'completed') {
        setCallState('Video connected ✅');
        setCanReconnect(false);
      } else if (state === 'failed') {
        setCallState('Connection failed');
        setCanReconnect(true);
      } else if (state === 'disconnected') {
        setCallState('Peer disconnected');
        setCanReconnect(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔌 Connection state: ${pc.connectionState}`);
    };

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        console.log(`➕ Adding local track: ${track.kind}`);
        pc.addTrack(track, localStream.current!);
      });
    }

    if (isInitiator) {
      console.log('📤 Creating and sending offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.current?.emit('offer', { roomId, offer });
      console.log('📤 Offer sent');
    }
  }, [roomId]);

  // ── Flush queued ICE candidates ────────────────────────────────────
  const flushIceCandidates = useCallback(async () => {
    if (iceCandidateQueue.current.length === 0) return;
    console.log(`❄️ Flushing ${iceCandidateQueue.current.length} queued ICE candidates`);
    for (const candidate of iceCandidateQueue.current) {
      try {
        await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('❌ ICE candidate flush error:', e);
      }
    }
    iceCandidateQueue.current = [];
  }, []);

  // ── Main initialization ────────────────────────────────────────────
  const initCall = useCallback(async () => {
    setCanReconnect(false);
    setIceState('new');
    setErrorDetail('');
    iceCandidateQueue.current = [];
    userEndedRef.current = false;

    try {
      // 1. Acquire media
      const stream = await acquireMedia();
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        return;
      }
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Connect socket
      setCallState('Connecting to server...');
      if (socket.current) {
        try { socket.current.disconnect(); } catch (e) { /* ignore */ }
      }

      console.log('🔌 Creating socket connection (BACKEND_URL="' + BACKEND_URL + '")');
      const sock = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 10000,
      });
      socket.current = sock;

      // Pre-flight: wait for socket to actually connect
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Socket connection timeout (10s)'));
        }, 10000);

        sock.on('connect', () => {
          clearTimeout(timeoutId);
          console.log('✅ Socket connected:', sock.id);
          resolve();
        });

        sock.on('connect_error', (err: Error) => {
          clearTimeout(timeoutId);
          console.error('❌ Socket connect error:', err.message);
          reject(err);
        });
      });

      if (!isMountedRef.current) return;

      // 3. Socket is confirmed connected — join room
      setCallState('Joining room...');
      sock.emit('join-room', { roomId });
      console.log('🚪 Emitted join-room:', roomId);
      setCallState('Waiting for other party...');

      // ── Signaling event handlers ──

      sock.on('user-joined', async (data: { socketId: string }) => {
        console.log('👤 Peer joined room:', data.socketId);
        if (!isMountedRef.current) return;
        setCallState('Peer joined! Creating offer...');
        await createPeerConnection(true);
      });

      sock.on('room-ready', (data: { roomId: string; members: string[] }) => {
        console.log('✅ Room ready with members:', data.members);
      });

      sock.on('offer', async (data: { offer: any; from: string }) => {
        console.log('📥 Received offer from:', data.from);
        if (!isMountedRef.current) return;
        setCallState('Received offer. Creating answer...');
        await createPeerConnection(false);
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushIceCandidates();

        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer);
        sock.emit('answer', { roomId, answer });
        console.log('📤 Answer sent');
      });

      sock.on('answer', async (data: { answer: any }) => {
        console.log('📥 Received answer');
        if (!isMountedRef.current) return;
        setCallState('Answer received. Connecting...');
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushIceCandidates();
      });

      sock.on('ice-candidate', async (data: { candidate: any }) => {
        if (data.candidate && peerConnection.current) {
          if (peerConnection.current.remoteDescription && peerConnection.current.remoteDescription.type) {
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
              console.error('❌ Error adding ICE candidate:', e);
            }
          } else {
            iceCandidateQueue.current.push(data.candidate);
          }
        }
      });

      sock.on('call-ended', () => {
        console.log('📵 Call ended by remote peer');
        if (!isMountedRef.current) return;
        setCallState('Call Ended');
        // Remote ended: clean up and notify parent
        cleanupResources();
        userEndedRef.current = true;
        if (onEnd) onEnd();
      });

      sock.on('peer-disconnected', (data: { socketId: string }) => {
        console.log('👤 Peer disconnected:', data.socketId);
        if (!isMountedRef.current) return;
        setCallState('Peer disconnected');
        setCanReconnect(true);
      });

      sock.on('disconnect', () => {
        console.log('⚠️ Socket disconnected');
        if (isMountedRef.current && !userEndedRef.current) {
          setCanReconnect(true);
        }
      });

    } catch (err: any) {
      console.error('❌ Call initialization error:', err);
      if (!isMountedRef.current) return;
      const msg = err?.message || String(err);
      setErrorDetail(msg);
      if (msg.includes('Socket') || msg.includes('timeout')) {
        setCallState('Socket connection failed');
      } else {
        setCallState('Camera/Mic error');
      }
      setCanReconnect(true);
    }
  }, [roomId, BACKEND_URL, acquireMedia, createPeerConnection, flushIceCandidates, cleanupResources, onEnd]);

  // ── Mount / Unmount ────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    initCall();

    return () => {
      isMountedRef.current = false;
      // Cleanup resources but do NOT call onEnd here — the parent unmounts us
      // by setting activeCall=null, so calling onEnd again would be redundant
      if (socket.current?.connected) {
        socket.current.emit('end-call', { roomId });
      }
      cleanupResources();
      // Clean up canvas interval if any
      if ((window as any).__canvasInterval) {
        clearInterval((window as any).__canvasInterval);
      }
    };
  }, [roomId]);

  // ── Reconnect ──────────────────────────────────────────────────────
  const handleReconnect = () => {
    console.log('🔄 Reconnecting...');
    cleanupResources();
    initCall();
  };

  // ── ICE state badge color ──────────────────────────────────────────
  const getIceBadgeColor = () => {
    switch (iceState) {
      case 'connected':
      case 'completed':
        return '#48bb78';
      case 'checking':
        return '#ecc94b';
      case 'failed':
        return '#e53e3e';
      case 'disconnected':
        return '#ed8936';
      default:
        return '#a0aec0';
    }
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', minHeight: '500px',
      backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden',
    }}>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Local Video PiP */}
      <div style={{
        position: 'absolute', bottom: '90px', right: '20px',
        width: '150px', height: '200px', backgroundColor: '#333',
        borderRadius: '12px', overflow: 'hidden', border: '2px solid white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Status badges */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10,
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
          padding: '10px 18px', borderRadius: '20px', fontSize: '14px',
          fontWeight: 600, backdropFilter: 'blur(10px)',
        }}>
          {callState}
        </div>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: getIceBadgeColor(),
          padding: '6px 14px', borderRadius: '14px', fontSize: '11px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: getIceBadgeColor(), display: 'inline-block',
          }} />
          ICE: {iceState}
        </div>
        {errorDetail && (
          <div style={{
            backgroundColor: 'rgba(229,62,62,0.2)', color: '#feb2b2',
            padding: '6px 14px', borderRadius: '14px', fontSize: '11px',
            maxWidth: '300px', wordBreak: 'break-word',
          }}>
            {errorDetail}
          </div>
        )}
      </div>

      {/* Room info */}
      <div style={{
        position: 'absolute', top: '20px', right: '20px',
        backgroundColor: 'rgba(0,0,0,0.7)', color: '#a0aec0',
        padding: '6px 14px', borderRadius: '14px', fontSize: '10px',
        backdropFilter: 'blur(10px)', zIndex: 10,
      }}>
        Room: {roomId?.substring(0, 8)}...
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '16px', zIndex: 10,
      }}>
        {canReconnect && (
          <button
            onClick={handleReconnect}
            style={{
              backgroundColor: '#667eea', color: 'white',
              padding: '14px 36px', borderRadius: '30px', border: 'none',
              fontWeight: 700, cursor: 'pointer', fontSize: '16px',
              boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
              transition: 'all 0.2s',
            }}
          >
            🔄 Reconnect
          </button>
        )}
        <button
          onClick={() => endCall(true)}
          style={{
            backgroundColor: '#ef4444', color: 'white',
            padding: '14px 36px', borderRadius: '30px', border: 'none',
            fontWeight: 700, cursor: 'pointer', fontSize: '16px',
            boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
            transition: 'all 0.2s',
          }}
        >
          📵 End Call
        </button>
      </div>
    </div>
  );
}
