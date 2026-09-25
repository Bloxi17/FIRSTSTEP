/**
 * First Step Senior Secondary School — production server
 * Express + SQLite (file-based, no external DB service to pay for) + JWT cookie auth + file uploads.
 *
 * Run locally:   npm install && npm start
 * See README.md for deployment instructions.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4d2d3d4d8e9xa9firststepschhindwara2026';

/* ---------------------------------------------------------------------- */
/* Database setup                                                         */
/* ---------------------------------------------------------------------- */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'school.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    img_path TEXT NOT NULL,
    caption TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    src_path TEXT NOT NULL,
    caption TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    meta TEXT,
    description TEXT,
    img_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notice_date TEXT,
    body TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student TEXT, class_applied TEXT, parent TEXT, phone TEXT, email TEXT, message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT, email TEXT, message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed the admin account on first run only
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'ainesh@1710';
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Admin account created for username "${username}".`);
}

// Seed starter achievements, notices, banners, and gallery on first run
const achCount = db.prepare('SELECT COUNT(*) AS c FROM achievements').get().c;
if (achCount === 0) {
  const seedAch = db.prepare('INSERT INTO achievements (title, meta, description) VALUES (?, ?, ?)');
  seedAch.run('District Math Olympiad, First Place', 'Aarav Sharma (Class 10)', 'Exceptional dedication in mathematics and strong problem-solving impressed teachers and peers alike.');
  seedAch.run('Published Young Writer', 'Meera Patel (Class 9)', 'Her short story "The Secret Garden" was published in the school magazine, praised for its originality and depth.');
  seedAch.run('Eco Club Leadership', 'Riya Nair (Class 12)', 'Led the Eco Club and organised a school-wide tree plantation drive, building environmental awareness across classes.');
  seedAch.run('International Commerce Olympiad, 1st Prize', 'Ainesh (Class 11)', 'Won 1st Prize in the International Commerce Olympiad (ICO) showcasing academic mastery in commerce and analytical aptitude.');
}
const noticeCount = db.prepare('SELECT COUNT(*) AS c FROM notices').get().c;
if (noticeCount === 0) {
  const seedNotice = db.prepare('INSERT INTO notices (title, notice_date, body) VALUES (?, ?, ?)');
  seedNotice.run('Admissions open for Academic Session 2026-27', '24/09/2026', 'Enquiries are open for Nursery through Class 12. Connect with the school office or submit online.');
  seedNotice.run('Robotics & AI Hands-On Lab Schedule', '20/09/2026', 'Special weekly practical sessions in Coding and Artificial Intelligence commence this month for Middle & Senior wings.');
  seedNotice.run('School Office Timings', 'Mon-Fri', 'The school administrative office is open Monday to Friday, 9:00 AM to 12:30 PM for parent visits and fee queries.');
}
const bannerCount = db.prepare('SELECT COUNT(*) AS c FROM banners').get().c;
if (bannerCount === 0) {
  db.prepare('INSERT INTO banners (img_path, caption) VALUES (?, ?)').run('/img/building.jpg', 'First Step Senior Secondary School campus on Khapa Bhat Road, Dharam Tekri, Chhindwara');
}
const galleryCount = db.prepare('SELECT COUNT(*) AS c FROM gallery').get().c;
if (galleryCount === 0) {
  const seedGal = db.prepare('INSERT INTO gallery (category, type, src_path, caption) VALUES (?, ?, ?, ?)');
  seedGal.run('Campus', 'image', '/img/building.jpg', 'The First Step Senior Secondary School campus building');
  seedGal.run('Activities', 'image', '/img/building.jpg', 'Smart Classroom & Digital Learning Wing');
  seedGal.run('Sports', 'image', '/img/building.jpg', 'Campus Sports Ground & Athletics Arena');
}

/* ---------------------------------------------------------------------- */
/* File uploads                                                           */
/* ---------------------------------------------------------------------- */
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Derive extension strictly from validated mime type (prevents HTML/SVG/executable upload bypass)
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
    const name = crypto.randomBytes(12).toString('hex') + ext;
    cb(null, name);
  }
});
function fileFilter(allowVideo) {
  return (req, file, cb) => {
    const okImage = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    const okVideo = allowVideo && /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    if (okImage || okVideo) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images' + (allowVideo ? ' or MP4/WEBM videos' : '') + ' are allowed.'));
  };
}
const uploadImageOnly = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: fileFilter(false) });
const uploadImageOrVideo = multer({ storage, limits: { fileSize: 40 * 1024 * 1024 }, fileFilter: fileFilter(true) });

/* ---------------------------------------------------------------------- */
/* App setup                                                               */
/* ---------------------------------------------------------------------- */
const app = express();
app.set('trust proxy', 1);
// Restrict CORS: Same-origin by default; do not reflect untrusted origins with credentials
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Security HTTP response headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts. Try again in a few minutes.' } });
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many submissions. Please try again later.' } });

/* ---------------------------------------------------------------------- */
/* Auth helpers                                                            */
/* ---------------------------------------------------------------------- */
function signToken(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
}
function setSessionCookie(res, token) {
  res.cookie('session', token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000
  });
}
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

/* ---------------------------------------------------------------------- */
/* Auth routes                                                             */
/* ---------------------------------------------------------------------- */
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  setSessionCookie(res, signToken(admin));
  res.json({ ok: true, username: admin.username });
});
app.post('/api/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (!token) return res.json({ loggedIn: false });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ loggedIn: true, username: data.username });
  } catch (e) {
    res.json({ loggedIn: false });
  }
});

/* ---------------------------------------------------------------------- */
/* Public read routes                                                      */
/* ---------------------------------------------------------------------- */
app.get('/api/public/all', (req, res) => {
  res.json({
    banners: db.prepare('SELECT id, img_path AS img, caption FROM banners ORDER BY id ASC').all(),
    gallery: db.prepare('SELECT id, category, type, src_path AS src, caption FROM gallery ORDER BY id DESC').all(),
    achievements: db.prepare('SELECT id, title, meta, description AS desc, img_path AS img FROM achievements ORDER BY id DESC').all(),
    notices: db.prepare('SELECT id, title, notice_date AS date, body AS text FROM notices ORDER BY id DESC').all()
  });
});

/* ---------------------------------------------------------------------- */
/* Banners (admin)                                                         */
/* ---------------------------------------------------------------------- */
app.post('/api/banners', requireAuth, uploadImageOnly.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image file is required.' });
  const imgPath = '/uploads/' + req.file.filename;
  const info = db.prepare('INSERT INTO banners (img_path, caption) VALUES (?, ?)').run(imgPath, req.body.caption || '');
  res.json({ id: info.lastInsertRowid, img: imgPath, caption: req.body.caption || '' });
});
app.delete('/api/banners/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (row) {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    removeUploadedFile(row.img_path);
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------- */
/* Gallery (admin)                                                         */
/* ---------------------------------------------------------------------- */
app.post('/api/gallery', requireAuth, uploadImageOrVideo.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A photo or video file is required.' });
  const type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  const srcPath = '/uploads/' + req.file.filename;
  const category = req.body.category || 'Campus';
  const info = db.prepare('INSERT INTO gallery (category, type, src_path, caption) VALUES (?, ?, ?, ?)')
    .run(category, type, srcPath, req.body.caption || '');
  res.json({ id: info.lastInsertRowid, category, type, src: srcPath, caption: req.body.caption || '' });
});
app.delete('/api/gallery/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (row) {
    db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
    removeUploadedFile(row.src_path);
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------- */
/* Achievements (admin)                                                    */
/* ---------------------------------------------------------------------- */
app.post('/api/achievements', requireAuth, uploadImageOnly.single('file'), (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  const imgPath = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare('INSERT INTO achievements (title, meta, description, img_path) VALUES (?, ?, ?, ?)')
    .run(title, req.body.meta || '', req.body.description || '', imgPath);
  res.json({ id: info.lastInsertRowid, title, meta: req.body.meta || '', desc: req.body.description || '', img: imgPath });
});
app.delete('/api/achievements/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM achievements WHERE id = ?').get(req.params.id);
  if (row) {
    db.prepare('DELETE FROM achievements WHERE id = ?').run(req.params.id);
    if (row.img_path) removeUploadedFile(row.img_path);
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------- */
/* Notices (admin)                                                         */
/* ---------------------------------------------------------------------- */
app.post('/api/notices', requireAuth, (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  const date = new Date().toLocaleDateString('en-IN');
  const info = db.prepare('INSERT INTO notices (title, notice_date, body) VALUES (?, ?, ?)')
    .run(title, date, req.body.text || '');
  res.json({ id: info.lastInsertRowid, title, date, text: req.body.text || '' });
});
app.delete('/api/notices/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------- */
/* Admissions & contact messages                                           */
/* ---------------------------------------------------------------------- */
app.post('/api/admissions', formLimiter, (req, res) => {
  const b = req.body || {};
  if (b.hp || b.bot_check_field) {
    // Silent drop for automated spam bots
    return res.json({ ok: true });
  }
  if (!b.student || !b.parent || !b.phone) return res.status(400).json({ error: 'Student name, parent name and phone are required.' });
  const student = String(b.student).trim().slice(0, 100);
  const cls = String(b.cls || '').trim().slice(0, 50);
  const parent = String(b.parent).trim().slice(0, 100);
  const phone = String(b.phone).trim().slice(0, 25);
  const email = String(b.email || '').trim().slice(0, 100);
  const msg = String(b.msg || '').trim().slice(0, 1000);
  db.prepare('INSERT INTO admissions (student, class_applied, parent, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)')
    .run(student, cls, parent, phone, email, msg);
  res.json({ ok: true });
});
app.get('/api/admissions', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM admissions ORDER BY id DESC').all());
});

app.post('/api/messages', formLimiter, (req, res) => {
  const b = req.body || {};
  if (b.hp || b.bot_check_field) {
    // Silent drop for automated spam bots
    return res.json({ ok: true });
  }
  if (!b.name || !b.phone || !b.msg) return res.status(400).json({ error: 'Name, phone and message are required.' });
  const name = String(b.name).trim().slice(0, 100);
  const phone = String(b.phone).trim().slice(0, 25);
  const email = String(b.email || '').trim().slice(0, 100);
  const msg = String(b.msg).trim().slice(0, 1000);
  db.prepare('INSERT INTO messages (name, phone, email, message) VALUES (?, ?, ?, ?)')
    .run(name, phone, email, msg);
  res.json({ ok: true });
});
app.get('/api/messages', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all());
});

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */
function removeUploadedFile(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return;
  // Use basename to prevent directory traversal
  const safeFilename = path.basename(publicPath);
  const full = path.resolve(UPLOAD_DIR, safeFilename);
  if (full.startsWith(UPLOAD_DIR)) {
    fs.unlink(full, () => {});
  }
}

app.use((err, req, res, next) => {
  if (err) {
    console.error(err.message);
    return res.status(400).json({ error: err.message || 'Something went wrong.' });
  }
  next();
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`First Step School server running on port ${PORT} (${NODE_ENV})`);
});
