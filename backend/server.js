const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Configure MySQL Database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Configure Multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ============== API ENDPOINTS ==============

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is running!' });
});

// Citizen: Submit new report
app.post('/api/reports', upload.single('image'), async (req, res) => {
    try {
        const { name, description, location, lat, lng } = req.body;
        
        // Validate required fields
        if (!name || !description || !location) {
            return res.status(400).json({ error: 'Name, description, and location are required' });
        }
        
        let imageUrl = null;
        
        // Upload image if provided
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
            const uploadRes = await cloudinary.uploader.upload(dataURI, {
                folder: 'road_reports',
                transformation: [{ width: 800, height: 600, crop: 'limit' }]
            });
            imageUrl = uploadRes.secure_url;
        }
        
        // Insert into database
        const query = `
            INSERT INTO reports (name, description, location, latitude, longitude, image_url, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `;
        
        db.query(query, [name, description, location, lat || null, lng || null, imageUrl], 
            (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to save report' });
                }
                res.json({ 
                    success: true, 
                    message: 'Report submitted successfully!',
                    reportId: result.insertId 
                });
            }
        );
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process report' });
    }
});

// Admin: Get all reports
app.get('/api/admin/reports', (req, res) => {
    const query = 'SELECT * FROM reports ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }
        res.json(results);
    });
});

// Admin: Get single report by ID
app.get('/api/admin/reports/:id', (req, res) => {
    const query = 'SELECT * FROM reports WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch report' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(results[0]);
    });
});

// Admin: Update report status
app.put('/api/admin/reports/:id', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const query = 'UPDATE reports SET status = ?, updated_at = NOW() WHERE id = ?';
    db.query(query, [status, req.params.id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update status' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json({ success: true, message: 'Status updated successfully' });
    });
});

// Admin: Delete report
app.delete('/api/admin/reports/:id', (req, res) => {
    const query = 'DELETE FROM reports WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete report' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json({ success: true, message: 'Report deleted successfully' });
    });
});

// Admin: Get statistics
app.get('/api/admin/stats', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM reports
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch stats' });
        }
        res.json(results[0]);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test the API at: http://localhost:${PORT}/api/test`);
});