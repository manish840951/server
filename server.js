 const fs = require('fs');
const https = require('https');
require('dotenv').config();
const express = require("express");
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongodb = require('mongodb');
const { auth } = require('express-openid-connect');
const Course = require('./models/Course');
const progressRoutes = require('./routes/progress');
const coursesRoutes = require('./routes/courses');

const app = express();

// ====== Database Connection ======
mongoose.connect('mongodb://localhost:27017/mydb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const conn = mongoose.connection;

// ====== GridFSBucket Initialization ======
let gfsBucket;
conn.once('open', () => {
  gfsBucket = new mongodb.GridFSBucket(conn.db, {
    bucketName: 'videos'
  });
  console.log('GridFSBucket initialized');
});

// ====== Middleware ======

app.use(cors({
  origin: "https://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Body Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Auth0 Configuration ---
app.use(auth({
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL, // e.g. 'httpss://dev-hi7wk41r2ps3p86c.us.auth0.com'
  baseURL: 'https://localhost:8000',
  clientID: process.env.AUTH0_CLIENT_ID,
  secret: process.env.AUTH0_APP_SECRET, // for cookie session
  clientSecret: process.env.AUTH0_CLIENT_SECRET, // REQUIRED for code flow!
  authRequired: false,
  authorizationParams: {
    response_type: 'code'
  }
}));

// Add this before your routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ====== Routes ======
app.use('/api/progress', progressRoutes);
app.use('/api/courses', coursesRoutes);

// ====== File Upload (GridFS Storage) ======
const storage = new GridFsStorage({
  db: mongoose.connection, // Use existing connection
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: 'videos'
  })
});
const upload = multer({ storage });

// ====== Upload Endpoint ======
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { courseId, title } = req.body;
    if (!req.file) return res.status(400).send('No file uploaded.');
    if (!courseId) return res.status(400).send('No courseId provided.');

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).send('Course not found');

    course.videos.push({
      title: title || req.file.originalname,
      filename: req.file.filename
    });
    await course.save();

    res.status(201).json({ filename: req.file.filename });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Internal server error');
  }
});

// ====== Video Streaming Endpoint ======
app.get('/api/video/:filename', async (req, res) => {
  try {
    if (!gfsBucket) return res.status(500).send('GridFSBucket not initialized');
    const filename = req.params.filename;

    const video = await conn.db.collection('videos.files').findOne({ filename });
    if (!video) return res.status(404).send('Video not found');

    const range = req.headers.range;
    if (!range || !/^bytes=\d*-\d*$/.test(range)) {
      return res.status(416).send('Requires valid Range header');
    }

    const videoSize = video.length;
    const CHUNK_SIZE = 10 ** 6;
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });

    gfsBucket.openDownloadStreamByName(filename, {
      start,
      end: end + 1
    }).pipe(res);

  } catch (err) {
    console.error('Video stream error:', err);
    res.status(500).send('Internal server error');
  }
});

// ====== Error Handling Middleware ======
app.use((err, req, res, next) => {
  if (err.status === 401 || err.status === 403) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 8000;
const sslOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
});
