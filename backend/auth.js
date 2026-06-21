const bcrypt = require('bcrypt');

// Middleware to verify admin
function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'];
    // Implement JWT or simple token validation
    // For production, use proper JWT authentication
    next();
}

// Login endpoint
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM admins WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const valid = await bcrypt.compare(password, results[0].password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign({ id: results[0].id }, 'your-secret-key', { expiresIn: '24h' });
        res.json({ token });
    });
});