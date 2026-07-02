import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/Theme';
import { API_BASE_URL } from '../constants/Config';

export default function VideoCallScreen() {
  const router = useRouter();
  const { roomId, consultantName, consultantId } = useLocalSearchParams<{
    roomId: string; consultantName: string; consultantId: string;
  }>();
  const [hasPermission, setHasPermission] = useState(false);
  const webViewRef = useRef<WebView>(null);
  console.log('--- VIDEO CALL SCREEN ---', { roomId, consultantId, consultantName });

  // Socket server — same as backend
  const SOCKET_URL = API_BASE_URL;

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const { PermissionsAndroid } = require('react-native');
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          const allGranted = Object.values(grants).every((g: unknown) => g === 'granted');
          if (allGranted) {
            setHasPermission(true);
          } else {
            Alert.alert('Permissions Required', 'Camera and microphone access is needed for video calls.');
            setHasPermission(true); // Try anyway — WebView may still work
          }
        } catch (err) {
          console.error('Permission request error:', err);
          setHasPermission(true);
        }
      } else {
        setHasPermission(true);
      }
    };
    requestPermissions();
  }, []);

  const handleEndCall = () => {
    router.back();
  };

  // ── Build inline HTML for the WebView ──────────────────────────────
  // IMPORTANT: Template literals inside the HTML string must NOT have
  // the backslash escape (i.e. use ${variable} not \${variable}).
  const videoCallHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Video Call</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      color: white;
    }
    #remoteVideo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #localVideo {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 120px;
      height: 160px;
      background: #333;
      object-fit: cover;
      transform: scaleX(-1);
      border-radius: 12px;
      border: 2px solid white;
    }
    #status {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0,0,0,0.6);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 10;
    }
    #iceState {
      position: absolute;
      top: 56px;
      left: 20px;
      background: rgba(0,0,0,0.6);
      padding: 4px 12px;
      border-radius: 14px;
      font-size: 11px;
      z-index: 10;
      color: #a0aec0;
    }
    #reconnectBtn {
      display: none;
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 12px 32px;
      border-radius: 30px;
      border: none;
      font-weight: bold;
      cursor: pointer;
      font-size: 16px;
      z-index: 10;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    #debug {
      position: absolute;
      bottom: 120px;
      left: 10px;
      right: 10px;
      max-height: 100px;
      overflow-y: auto;
      background: rgba(0,0,0,0.7);
      color: #48bb78;
      padding: 8px;
      border-radius: 8px;
      font-size: 10px;
      font-family: monospace;
      z-index: 10;
      display: none;
    }
  </style>
</head>
<body>
  <video id="remoteVideo" autoplay playsinline></video>
  <video id="localVideo" autoplay muted playsinline></video>
  <div id="status">Initializing...</div>
  <div id="iceState">ICE: new</div>
  <button id="reconnectBtn" onclick="reconnect()">🔄 Reconnect</button>
  <div id="debug"></div>

  <!-- Load socket.io via CDN -->
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <script>
    const statusEl = document.getElementById('status');
    const iceStateEl = document.getElementById('iceState');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const reconnectBtn = document.getElementById('reconnectBtn');
    const debugEl = document.getElementById('debug');
    
    let peerConnection;
    let localStream;
    let iceCandidateQueue = [];
    let socket;

    const SOCKET_URL = "${SOCKET_URL}";
    const roomId = "${roomId}";
    const callerName = "${consultantName || 'Farmer'}";
    const consultantId = "${consultantId}";

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    // Debug logger — sends to both WebView console and the on-screen debug panel
    function log(msg) {
      const ts = new Date().toLocaleTimeString();
      const line = ts + ' ' + msg;
      console.log('[VideoCall] ' + line);

      // Post to React Native
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: line }));
      } catch(e) {}

      // On-screen debug (uncomment debugEl.style.display to see)
      // debugEl.style.display = 'block';
      // debugEl.innerHTML = line + '<br>' + debugEl.innerHTML;
    }

    function showReconnect() {
      reconnectBtn.style.display = 'block';
    }

    function hideReconnect() {
      reconnectBtn.style.display = 'none';
    }

    async function init() {
      try {
        hideReconnect();
        iceCandidateQueue = [];

        // 1. Acquire media
        statusEl.innerText = "Requesting Camera...";
        log("Requesting camera/mic...");
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          log("✅ Real camera acquired: " + localStream.getTracks().map(t => t.kind).join(', '));
        } catch (err) {
          log("⚠️ Camera failed: " + err.message + " — using fallback");
          statusEl.innerText = "Camera failed, using fallback...";
          const canvas = document.createElement("canvas");
          canvas.width = 640; canvas.height = 480;
          const ctx = canvas.getContext("2d");
          let angle = 0;
          setInterval(() => {
            ctx.fillStyle = "#1a202c"; ctx.fillRect(0,0,640,480);
            ctx.translate(320, 240); ctx.rotate(angle);
            ctx.fillStyle = "#e53e3e"; ctx.fillRect(-100,-100,200,200);
            ctx.setTransform(1,0,0,1,0,0);
            ctx.fillStyle = "white"; ctx.font = "bold 40px sans-serif";
            ctx.fillText("📱 MOBILE", 220, 250);
            angle += 0.05;
          }, 50);
          localStream = canvas.captureStream(20);
          
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const actx = new AudioContext();
            const dest = actx.createMediaStreamDestination();
            const osc = actx.createOscillator();
            osc.connect(dest); osc.start();
            localStream.addTrack(dest.stream.getAudioTracks()[0]);
          }
        }
        localVideo.srcObject = localStream;
        
        // 2. Connect socket with pre-flight check
        statusEl.innerText = "Connecting to Server...";
        log("Connecting socket to: " + SOCKET_URL);
        
        if (socket) {
          socket.disconnect();
        }
        socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

        // Wait for socket to actually connect
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Socket connection timeout (10s)"));
          }, 10000);

          socket.on('connect', () => {
            clearTimeout(timeout);
            log("✅ Socket connected: " + socket.id);
            resolve();
          });

          socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            log("❌ Socket connect error: " + err.message);
            reject(err);
          });
        });

        // 3. Socket confirmed connected — join room and signal consultant
        statusEl.innerText = "Calling consultant...";
        log("Emitting call-consultant: consultantId=" + consultantId + " room=" + roomId);
        socket.emit('call-consultant', { consultantId: consultantId, roomId, callerName });
        socket.emit('join-room', { roomId });
        log("Joined room: " + roomId);

        // ── Signaling handlers ──

        socket.on('user-joined', async (data) => {
          log("👤 Peer joined: " + data.socketId);
          statusEl.innerText = "Consultant joined. Initiating...";
          createPeerConnection();
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
          log("📤 Offer sent");
        });

        socket.on('room-ready', (data) => {
          log("✅ Room ready: " + JSON.stringify(data.members));
        });

        socket.on('offer', async (data) => {
          log("📥 Offer received from: " + data.from);
          statusEl.innerText = "Connecting secure channel...";
          createPeerConnection();
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

          // Flush queued candidates
          log("Flushing " + iceCandidateQueue.length + " queued ICE candidates");
          for (const candidate of iceCandidateQueue) {
            try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {
              log("❌ ICE flush error: " + e.message);
            }
          }
          iceCandidateQueue = [];

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
          log("📤 Answer sent");
        });

        socket.on('answer', async (data) => {
          log("📥 Answer received");
          statusEl.innerText = "Call connected";
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

          log("Flushing " + iceCandidateQueue.length + " queued ICE candidates");
          for (const candidate of iceCandidateQueue) {
            try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {
              log("❌ ICE flush error: " + e.message);
            }
          }
          iceCandidateQueue = [];
        });

        socket.on('ice-candidate', async (data) => {
          if (data.candidate && peerConnection) {
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch(e) {
                log("❌ ICE add error: " + e.message);
              }
            } else {
              log("❄️ Queuing ICE candidate (no remote desc yet)");
              iceCandidateQueue.push(data.candidate);
            }
          }
        });

        socket.on('call-ended', () => {
          log("📵 Call ended by peer");
          statusEl.innerText = "Call Ended by peer";
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'call-ended' })); } catch(e) {}
        });

        socket.on('call-failed', (data) => {
          log("❌ Call failed: " + data.reason);
          statusEl.innerText = "Call Failed: " + data.reason;
          showReconnect();
        });
        
        socket.on('call-rejected', (data) => {
          log("❌ Call rejected: " + data.reason);
          statusEl.innerText = "Call Rejected: " + data.reason;
          setTimeout(() => {
            try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'call-ended' })); } catch(e) {}
          }, 2000);
        });

        socket.on('peer-disconnected', (data) => {
          log("👤 Peer disconnected: " + data.socketId);
          statusEl.innerText = "Peer disconnected";
          showReconnect();
        });

        socket.on('disconnect', () => {
          log("⚠️ Socket disconnected!");
          showReconnect();
        });

      } catch (err) {
        log("❌ Init error: " + err.message);
        statusEl.innerText = "Error: " + err.message;
        showReconnect();
      }
    }

    function createPeerConnection() {
      if (peerConnection) peerConnection.close();
      peerConnection = new RTCPeerConnection(config);
      log("🔗 PeerConnection created");
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      peerConnection.ontrack = (event) => {
        log("📺 Remote track: " + event.track.kind);
        if (remoteVideo.srcObject !== event.streams[0]) {
          remoteVideo.srcObject = event.streams[0];
          statusEl.innerText = "Call connected";
          log("📺 Remote video attached");
        }
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        log("🧊 ICE state: " + state);
        iceStateEl.innerText = "ICE: " + state;
        iceStateEl.style.color = (state === 'connected' || state === 'completed') ? '#48bb78'
          : state === 'checking' ? '#ecc94b'
          : state === 'failed' ? '#e53e3e'
          : state === 'disconnected' ? '#ed8936'
          : '#a0aec0';

        if (state === 'connected' || state === 'completed') {
          hideReconnect();
        } else if (state === 'failed' || state === 'disconnected') {
          statusEl.innerText = state === 'failed' ? "Connection failed" : "User disconnected";
          showReconnect();
        }
      };

      peerConnection.onconnectionstatechange = () => {
        log("🔌 Connection state: " + peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          showReconnect();
        }
      };

      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
          log("➕ Added local track: " + track.kind);
        });
      }
    }

    function reconnect() {
      log("🔄 Reconnecting...");
      statusEl.innerText = "Reconnecting...";
      hideReconnect();
      if (peerConnection) { try { peerConnection.close(); } catch(e){} peerConnection = null; }
      if (socket) { try { socket.disconnect(); } catch(e){} socket = null; }
      init();
    }

    init();
  </script>
</body>
</html>
`;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleEndCall} style={s.backBtn}>
          <Text style={s.backText}>← End Call</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>📹 Video Call</Text>
          <Text style={s.headerSub}>{consultantName || 'Consultant'}</Text>
        </View>
      </View>

      {/* WebView for video call — inline HTML for camera access */}
      {hasPermission ? (
        <WebView
          ref={webViewRef}
          source={{ html: videoCallHtml, baseUrl: 'https://localhost' }}
          style={s.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          allowsFullscreenVideo={true}
          androidLayerType="hardware"
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'log') {
                console.log('[WebView]', data.message);
              } else if (data.type === 'call-ended') {
                handleEndCall();
              } else {
                console.log('WebView:', data.type, data.message || '');
              }
            } catch {}
          }}
        />
      ) : (
        <View style={s.permissionWrap}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🔒</Text>
          <Text style={s.permissionTitle}>Camera & Mic Required</Text>
          <Text style={s.permissionText}>Please grant camera and microphone permissions to start the video call.</Text>
          <TouchableOpacity onPress={() => setHasPermission(true)} style={s.retryBtn}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  header: {
    paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2d2d44',
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { marginRight: Spacing.md },
  backText: { fontSize: FontSize.md, color: '#e53e3e', fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: FontSize.sm, color: '#a0aec0', fontWeight: '500', marginTop: 2 },
  webview: { flex: 1, backgroundColor: '#0f0c29' },
  permissionWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl,
  },
  permissionTitle: {
    fontSize: FontSize.xl, fontWeight: '800', color: '#fff', marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSize.md, color: '#a0aec0', textAlign: 'center', lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    backgroundColor: '#667eea', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  retryText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
