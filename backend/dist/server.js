"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const db_1 = require("./config/db");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const Consultant_1 = __importDefault(require("./models/Consultant"));
// ─── Import Route Files ─────────────────────────────────────────────
const weatherRoutes_1 = __importDefault(require("./routes/weatherRoutes"));
const farmerRoutes_1 = __importDefault(require("./routes/farmerRoutes"));
const farmRoutes_1 = __importDefault(require("./routes/farmRoutes"));
const activityRoutes_1 = __importDefault(require("./routes/activityRoutes"));
const reminderRoutes_1 = __importDefault(require("./routes/reminderRoutes"));
const marketRoutes_1 = __importDefault(require("./routes/marketRoutes"));
const recommendationRoutes_1 = __importDefault(require("./routes/recommendationRoutes"));
const officerRoutes_1 = __importDefault(require("./routes/officerRoutes"));
const schemeRoutes_1 = __importDefault(require("./routes/schemeRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const diseaseRoutes_1 = __importDefault(require("./routes/diseaseRoutes"));
const sarvamRoutes_1 = __importDefault(require("./routes/sarvamRoutes"));
const consultantRoutes_1 = __importDefault(require("./routes/consultantRoutes"));
// ─── Create Express App + HTTP Server ───────────────────────────────
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
// ─── Socket.io ──────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});
// ─── Middleware ──────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Connect Database ───────────────────────────────────────────────
(0, db_1.connectDB)();
// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/weather', weatherRoutes_1.default);
app.use('/api/farmers', farmerRoutes_1.default);
app.use('/api/farms', farmRoutes_1.default);
app.use('/api/activities', activityRoutes_1.default);
app.use('/api/reminders', reminderRoutes_1.default);
app.use('/api/market', marketRoutes_1.default);
app.use('/api/recommendations', recommendationRoutes_1.default);
app.use('/api/officers', officerRoutes_1.default);
app.use('/api/schemes', schemeRoutes_1.default);
app.use('/api/chatbot', chatRoutes_1.default);
app.use('/api/disease', diseaseRoutes_1.default);
app.use('/api/sarvam', sarvamRoutes_1.default);
app.use('/api/consultants', consultantRoutes_1.default);
const pendingCalls = new Map(); // key = roomId
// Farmer creates a call request
app.post('/api/call-requests', (req, res) => {
    const { roomId, consultantId, farmerName } = req.body;
    if (!roomId || !consultantId) {
        return res.status(400).json({ success: false, message: 'roomId and consultantId required' });
    }
    const callReq = {
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
app.get('/api/call-requests/:consultantId', (req, res) => {
    const { consultantId } = req.params;
    const calls = [];
    for (const call of pendingCalls.values()) {
        if (call.consultantId === consultantId) {
            calls.push(call);
        }
    }
    res.json({ success: true, data: calls });
});
// Consultant accepts (remove from queue)
app.delete('/api/call-requests/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    pendingCalls.delete(roomId);
    console.log(`✅ Call request accepted/removed: ${roomId}`);
    res.json({ success: true });
});
// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── Error Handler (MUST be last) ───────────────────────────────────
app.use(errorHandler_1.default);
// ─── Socket.io Signaling ────────────────────────────────────────────
// Track online consultants: Map<consultantId, socketId>
const onlineConsultants = new Map();
// Track room members for debugging: Map<roomId, Set<socketId>>
const roomMembers = new Map();
function getRoomSize(roomId) {
    return roomMembers.get(roomId)?.size ?? 0;
}
io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    // ── Consultant goes online ──────────────────────────────────────
    socket.on('consultant-online', async (data) => {
        const { consultantId } = data;
        onlineConsultants.set(consultantId, socket.id);
        console.log(`🟢 Consultant online: ${consultantId} → ${socket.id}`);
        // Update DB
        try {
            await Consultant_1.default.findByIdAndUpdate(consultantId, {
                is_online: true,
                socket_id: socket.id
            });
        }
        catch (e) {
            console.error('Failed to update consultant online status:', e);
        }
    });
    // ── Farmer calls a consultant ───────────────────────────────────
    socket.on('call-consultant', (data) => {
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
        }
        else {
            socket.emit('call-failed', { reason: 'Consultant is offline' });
            console.log(`❌ Call failed: consultant ${consultantId} is offline`);
        }
    });
    // ── Consultant accepts call ─────────────────────────────────────
    socket.on('call-accepted', (data) => {
        const { roomId, callerSocketId } = data;
        io.to(callerSocketId).emit('call-accepted', { roomId });
        console.log(`✅ [call-accepted] room=${roomId} notifying caller=${callerSocketId}`);
    });
    // ── Consultant rejects call ─────────────────────────────────────
    socket.on('call-rejected', (data) => {
        const { callerSocketId, reason } = data;
        io.to(callerSocketId).emit('call-rejected', { reason: reason || 'Consultant declined' });
        console.log(`❌ [call-rejected] notifying caller=${callerSocketId} reason=${reason}`);
    });
    // ── Join a video call room ──────────────────────────────────────
    socket.on('join-room', (data) => {
        try {
            const { roomId } = data;
            socket.join(roomId);
            // Track room membership
            if (!roomMembers.has(roomId)) {
                roomMembers.set(roomId, new Set());
            }
            roomMembers.get(roomId).add(socket.id);
            const size = getRoomSize(roomId);
            console.log(`🚪 [join-room] ${socket.id} joined room=${roomId} (${size} members now)`);
            // Notify others in the room
            socket.to(roomId).emit('user-joined', { socketId: socket.id });
            // If 2 members, both sides are ready — emit 'room-ready' to everyone
            if (size >= 2) {
                console.log(`✅ [room-ready] room=${roomId} has ${size} members — signaling ready`);
                io.to(roomId).emit('room-ready', { roomId, members: Array.from(roomMembers.get(roomId)) });
            }
        }
        catch (e) {
            console.error(`❌ [join-room] error for ${socket.id}:`, e);
        }
    });
    // ── WebRTC signaling: offer ─────────────────────────────────────
    socket.on('offer', (data) => {
        try {
            console.log(`📤 [offer] from=${socket.id} room=${data.roomId} type=${data.offer?.type}`);
            socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
        }
        catch (e) {
            console.error(`❌ [offer] relay error:`, e);
        }
    });
    // ── WebRTC signaling: answer ────────────────────────────────────
    socket.on('answer', (data) => {
        try {
            console.log(`📥 [answer] from=${socket.id} room=${data.roomId} type=${data.answer?.type}`);
            socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
        }
        catch (e) {
            console.error(`❌ [answer] relay error:`, e);
        }
    });
    // ── WebRTC signaling: ICE candidate ─────────────────────────────
    socket.on('ice-candidate', (data) => {
        try {
            console.log(`❄️  [ice-candidate] from=${socket.id} room=${data.roomId} candidate=${data.candidate?.candidate?.substring(0, 50)}...`);
            socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
        }
        catch (e) {
            console.error(`❌ [ice-candidate] relay error:`, e);
        }
    });
    // ── End call ────────────────────────────────────────────────────
    socket.on('end-call', (data) => {
        try {
            console.log(`📵 [end-call] from=${socket.id} room=${data.roomId}`);
            socket.to(data.roomId).emit('call-ended');
            socket.leave(data.roomId);
            // Clean up room tracking
            if (roomMembers.has(data.roomId)) {
                roomMembers.get(data.roomId).delete(socket.id);
                if (roomMembers.get(data.roomId).size === 0) {
                    roomMembers.delete(data.roomId);
                    console.log(`🗑️  Room ${data.roomId} is now empty — cleaned up`);
                }
            }
        }
        catch (e) {
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
                    await Consultant_1.default.findByIdAndUpdate(consultantId, {
                        is_online: false,
                        socket_id: ''
                    });
                }
                catch (e) { /* ignore */ }
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
