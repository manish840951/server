
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');

// Get all courses
router.get('/', async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

// Get a single course by ID
router.get('/:id', async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

module.exports = router;
