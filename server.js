const progressRoutes = require('./routes/progress');
const express = require("express");
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongodb = require('mongodb');
const Course = require('./models/Course');
const { auth } = require('express-openid-connect');
const app = express();

// Database connection
mongoose.connect('mongodb://localhost:27017/mydb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const conn = mongoose.connection;




// GridFSBucket initialization
let gfsBucket;
conn.once('open', () => {
  gfsBucket = new mongodb.GridFSBucket(conn.db, {
    bucketName: 'videos'
  });
  console.log('GridFSBucket initialized');
});

// Middleware - CORRECT ORDER IS CRUCIAL
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));


// Auth0 configuration
app.use(auth({
  issuerBaseURL: 'https://dev-hi7wk41r2ps3p86c.us.auth0.com',         // e.g. https://dev-xxxxxx.us.auth0.com
  baseURL: 'http://localhost:8000',             // Your Express backend URL
  clientID: 'itlXmyskZMuv2VNIViBG7MThAzsFvtie',
  secret: 'yFjuTXXuHADsWoLTxKTBmfj7PUDys1sfa7mMkckryOUEW6e5_4_6zUVEbZotnz1n',
   authRequired: false,
  // If using authorization code flow:
  // clientSecret: 'YOUR_CLIENT_SECRET'
}));


app.use('/api/progress', progressRoutes);
// 1. Create storage AFTER connection is open
const storage = new GridFsStorage({
  url: 'mongodb://localhost:27017/mydb',
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: 'videos' // FIX 1: Add bucket name here
  })
});

const upload = multer({ storage });
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/courses', require('./routes/courses'));


app.post('/api/upload', upload.single('file'), async (req, res) => {
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
});



// Video streaming endpoint
app.get('/api/video/:filename', async (req, res) => {
  try {
    if (!gfsBucket) return res.status(500).send('GridFSBucket not initialized');
    const filename = req.params.filename;
  
    const video = await conn.db.collection('videos.files').findOne({ filename });

    if (!video) return res.status(404).send('Video not found');

    const range = req.headers.range;
    if (!range) return res.status(400).send('Requires Range header');

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
    console.error('Server error:', err);
    res.status(500).send('Internal server error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.status === 401 || err.status === 403) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
