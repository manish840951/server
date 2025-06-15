// models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  videos: [
    {
      title: String,
      filename: String, // GridFS filename
    }
  ]
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
