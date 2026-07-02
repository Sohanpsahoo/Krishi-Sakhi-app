import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db';
import errorHandler from './middleware/errorHandler';
import Consultant from './models/Consultant';

// ─── Import Route Files ─────────────────────────────────────────────
import weatherRoutes from './routes/weatherRoutes';
import farmerRoutes from './routes/farmerRoutes';
import farmRoutes from './routes/farmRoutes';
import activityRoutes from './routes/activityRoutes';
import reminderRoutes from './routes/reminderRoutes';
import marketRoutes from './routes/marketRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import officerRoutes from './routes/officerRoutes';
import schemeRoutes from './routes/schemeRoutes';
import chatRoutes from './routes/chatRoutes';
import diseaseRoutes from './routes/diseaseRoutes';
import sarvamRoutes from './routes/sarvamRoutes';
import consultantRoutes from './routes/consultantRoutes';

// ─── Create Express App + HTTP Server ───────────────────────────────
const app: Express = express();
const httpServer = http.createServer(app);

// ─── Socket.io ──────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Connect Database ───────────────────────────────────────────────
connectDB();

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/weather', weatherRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/sarvam', sarvamRoutes);
app.use('/api/consultants', consultantRoutes);

// ─── In-Memory Call Request Queue ───────────────────────────────────
// Bridges the mobile WebView video call with the consultant dashboard.
// When a farmer taps "Video Call" on mobile, the app POSTs here.
// The consultant dashboard polls GET to see pending calls, then joins.
interface CallRequest {
  roomId: string;
  consultantId: string;
  farmerName: string;
  createdAt: number;
}
const pendingCalls = new Map<string, CallRequest>(); // key = roomId

// Farmer creates a call request
app.post('/api/call-requests', (req: Request, res: Response) => {
  const { roomId, consultantId, farmerName } = req.body;
  if (!roomId || !consultantId) {
    return res.status(400).json({ success: false, message: 'roomId and consultantId required' });
  }
  const callReq: CallRequest = {
    roomId,
    consultantId,
    farmerName: farmerName || 'A Farmer',
    createdAt: Date.now(),
  };
  pendingCalls.set(roomId, callReq);
  console.log(`📞 Call request created: ${farmerName} → consultant ${consultantId} (room: ${roomId})`);

  // Auto-expire after 2 minutes
  setTimeout(() => { pendingCalls.delete(roomId); }, 120_000);

  res.json({ success: true, data: callReq });
});

// Consultant fetches pending calls
app.get('/api/call-requests/:consultantId', (req: Request, res: Response) => {
  const { consultantId } = req.params;
  const calls: CallRequest[] = [];
  for (const call of pendingCalls.values()) {
    if (call.consultantId === consultantId) {
      calls.push(call);
    }
  }
  res.json({ success: true, data: calls });
});

// Consultant accepts (remove from queue)
app.delete('/api/call-requests/:roomId', (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  pendingCalls.delete(roomId);
  console.log(`✅ Call request accepted/removed: ${roomId}`);
  res.json({ success: true });
});

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler (MUST be last) ───────────────────────────────────
app.use(errorHandler);

// ─── Socket.io Signaling ────────────────────────────────────────────
// Track online consultants: Map<consultantId, socketId>
const onlineConsultants = new Map<string, string>();
// Track room members for debugging: Map<roomId, Set<socketId>>
const roomMembers = new Map<string, Set<string>>();

function getRoomSize(roomId: string): number {
  return roomMembers.get(roomId)?.size ?? 0;
}

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── Consultant goes online ──────────────────────────────────────
  socket.on('consultant-online', async (data: { consultantId: string }) => {
    const { consultantId } = data;
    onlineConsultants.set(consultantId, socket.id);
    console.log(`🟢 Consultant online: ${consultantId} → ${socket.id}`);

    // Update DB
    try {
      await Consultant.findByIdAndUpdate(consultantId, {
        is_online: true,
        socket_id: socket.id
      });
    } catch (e) { console.error('Failed to update consultant online status:', e); }
  });

  // ── Farmer calls a consultant ───────────────────────────────────
  socket.on('call-consultant', (data: { consultantId: string; roomId: string; callerName: string }) => {
    const { consultantId, roomId, callerName } = data;
    const consultantSocketId = onlineConsultants.get(consultantId);
    console.log(`📞 [call-consultant] from=${socket.id} consultant=${consultantId} room=${roomId} callerName=${callerName} consultantSocketId=${consultantSocketId || 'OFFLINE'}`);

    if (consultantSocketId) {
      io.to(consultantSocketId).emit('incoming-call', {
        roomId,
        callerName,
        callerSocketId: socket.id
      });
      console.log(`📞 Incoming-call emitted to ${consultantSocketId}`);
    } else {
      socket.emit('call-failed', { reason: 'Consultant is offline' });
      console.log(`❌ Call failed: consultant ${consultantId} is offline`);
    }
  });

  // ── Consultant accepts call ─────────────────────────────────────
  socket.on('call-accepted', (data: { roomId: string; callerSocketId: string }) => {
    const { roomId, callerSocketId } = data;
    io.to(callerSocketId).emit('call-accepted', { roomId });
    console.log(`✅ [call-accepted] room=${roomId} notifying caller=${callerSocketId}`);
  });

  // ── Consultant rejects call ─────────────────────────────────────
  socket.on('call-rejected', (data: { callerSocketId: string; reason?: string }) => {
    const { callerSocketId, reason } = data;
    io.to(callerSocketId).emit('call-rejected', { reason: reason || 'Consultant declined' });
    console.log(`❌ [call-rejected] notifying caller=${callerSocketId} reason=${reason}`);
  });

  // ── Join a video call room ──────────────────────────────────────
  socket.on('join-room', (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      socket.join(roomId);

      // Track room membership
      if (!roomMembers.has(roomId)) {
        roomMembers.set(roomId, new Set());
      }
      roomMembers.get(roomId)!.add(socket.id);
      const size = getRoomSize(roomId);

      console.log(`🚪 [join-room] ${socket.id} joined room=${roomId} (${size} members now)`);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', { socketId: socket.id });

      // If 2 members, both sides are ready — emit 'room-ready' to everyone
      if (size >= 2) {
        console.log(`✅ [room-ready] room=${roomId} has ${size} members — signaling ready`);
        io.to(roomId).emit('room-ready', { roomId, members: Array.from(roomMembers.get(roomId)!) });
      }
    } catch (e) {
      console.error(`❌ [join-room] error for ${socket.id}:`, e);
    }
  });

  // ── WebRTC signaling: offer ─────────────────────────────────────
  socket.on('offer', (data: { roomId: string; offer: any }) => {
    try {
      console.log(`📤 [offer] from=${socket.id} room=${data.roomId} type=${data.offer?.type}`);
      socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
    } catch (e) {
      console.error(`❌ [offer] relay error:`, e);
    }
  });

  // ── WebRTC signaling: answer ────────────────────────────────────
  socket.on('answer', (data: { roomId: string; answer: any }) => {
    try {
      console.log(`📥 [answer] from=${socket.id} room=${data.roomId} type=${data.answer?.type}`);
      socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
    } catch (e) {
      console.error(`❌ [answer] relay error:`, e);
    }
  });

  // ── WebRTC signaling: ICE candidate ─────────────────────────────
  socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
    try {
      console.log(`❄️  [ice-candidate] from=${socket.id} room=${data.roomId} candidate=${data.candidate?.candidate?.substring(0, 50)}...`);
      socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
    } catch (e) {
      console.error(`❌ [ice-candidate] relay error:`, e);
    }
  });

  // ── End call ────────────────────────────────────────────────────
  socket.on('end-call', (data: { roomId: string }) => {
    try {
      console.log(`📵 [end-call] from=${socket.id} room=${data.roomId}`);
      socket.to(data.roomId).emit('call-ended');
      socket.leave(data.roomId);

      // Clean up room tracking
      if (roomMembers.has(data.roomId)) {
        roomMembers.get(data.roomId)!.delete(socket.id);
        if (roomMembers.get(data.roomId)!.size === 0) {
          roomMembers.delete(data.roomId);
          console.log(`🗑️  Room ${data.roomId} is now empty — cleaned up`);
        }
      }
    } catch (e) {
      console.error(`❌ [end-call] error:`, e);
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);

    // Remove from all tracked rooms
    for (const [roomId, members] of roomMembers.entries()) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        console.log(`🚪 ${socket.id} removed from room=${roomId} (${members.size} remaining)`);
        // Notify remaining members
        io.to(roomId).emit('peer-disconnected', { socketId: socket.id });
        if (members.size === 0) {
          roomMembers.delete(roomId);
          console.log(`🗑️  Room ${roomId} is now empty — cleaned up`);
        }
      }
    }

    // Remove from online consultants
    for (const [consultantId, sid] of onlineConsultants.entries()) {
      if (sid === socket.id) {
        onlineConsultants.delete(consultantId);
        try {
          await Consultant.findByIdAndUpdate(consultantId, {
            is_online: false,
            socket_id: ''
          });
        } catch (e) { /* ignore */ }
        console.log(`🔴 Consultant offline: ${consultantId}`);
        break;
      }
    }
  });
});

// ─── Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
  console.log(`🔌 Socket.io ready for video call signaling`);
});