const express = require('express');
const http = require('http');
const socket = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require("cors");
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session'); // New session routes
const { router: patientRoutes } = require('./routes/patient');

const Session = require('./models/Session');
const Patient = require('./models/Patient');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes); // Add session routes
// app.use('/api/patients', patientRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log('Error connecting to MongoDB:', err));

// Socket.IO Setup
const server = http.createServer(app);
// const io = socket(server);
const io = socket(server, {
    cors: {
        origin: "*",  // You can specify specific domains here instead of "*"
        methods: ["GET", "POST"]
    },
    transports: ['websocket']
});

let activeStreams = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', async ({ roomId, patientId }) => {
        socket.join(roomId);
        console.log("roomId", roomId)

        const session = await Session.findOneAndUpdate(
            { sessionId: roomId },
            { patientId, sessionId: roomId },
            { upsert: true, new: true }
        );

        activeStreams.set(patientId, socket.id); // Track streaming status
        activeStreams.set(`${patientId} room`, roomId);
        console.log(`Patient joined room: ${roomId}`);
    });

    socket.on('joinRoomDoctor', async ({ roomId }) => {
        console.log("Doctor joined the room " + roomId);
        socket.join(roomId);
    });

    socket.on('heartRate', async ({ roomId, heartRate, patientId }) => {
        console.log("roomId, heartRate", roomId, heartRate)
        let breathRate = heartRate / 4.5
        if (heartRate >= 90) {
            breathRate = heartRate / 2.5
        }

        if (!activeStreams.get(`${patientId} stream`)) {
            activeStreams.set(`${patientId} stream`, []);
        }
        activeStreams.get(`${patientId} stream`).push({ heartRate, breathRate })

        await Session.findOneAndUpdate(
            { sessionId: roomId },
            { $push: { heartMetrics: heartRate, breathMetrics: breathRate } },
            { new: true }
        );
        socket.to(roomId).emit('heartRateStream', activeStreams.get(`${patientId} stream`));
    });

    socket.on('disconnect', () => {
        const patientId = [...activeStreams.entries()].find(
            ([, socketId]) => socketId === socket.id
        )?.[0];
        if (patientId) {
            activeStreams.delete(patientId); // Remove patient from active streams
            activeStreams.delete(`${patientId} stream`);
            console.log(`Patient stopped streaming: ${patientId}`);
        }

        const roomId = activeStreams.get(`${patientId} room`);
        socket.to(roomId).emit('streamEnd');
        activeStreams.delete(`${patientId} room`);

        console.log(`User disconnected: ${socket.id}`);
    });
});

app.get('/test', (req, res) => {
    console.log('Test route hit');
    res.status(200).json({ message: 'Test successful' });
  });

app.get('/api/patients', async (req, res) => {
    try {
      const patients = await Patient.find();
  
      const enrichedPatients = await Promise.all(
        patients.map(async (patient) => {
          const sessions = await Session.find({ patientId: patient._id }).sort({ createdAt: -1 });
          const currentSession = sessions[0]
          const isStreaming = activeStreams.has(patient._id.toString());
          return {
            ...patient.toObject(),
            currentSession: currentSession ? currentSession.sessionId : null,
            isStreaming,
            prevDataPoints: currentSession ? currentSession.heartMetrics : [],
            sessions
          };
        })
      );

      res.set('Content-Type', 'application/json');
  
      res.status(200).json({ patients: enrichedPatients });
    } catch (err) {
        console.log(err.message);
      res.status(500).json({ message: 'Error fetching patients', error: err.message });
    }
  });

server.listen(3001, () => console.log('Server running on port 3001'));
