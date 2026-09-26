// ============================================================
// VOLCRA.LAB — ESP32-S3 Camera Gallery
// main_server.js
//
// Cara menjalankan di VS Code terminal:
//   node main_server.js
//
// Server akan jalan di: http://localhost:3000
//
// Endpoint yang tersedia:
// GET  /status          → cek status online/offline ESP32-S3
// GET  /photos          → ambil daftar semua foto
// GET  /foto/:filename  → akses file foto langsung
// POST /upload          → terima foto kiriman dari ESP32-S3
// DELETE /photos/:filename → hapus foto
// ============================================================

const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const http     = require('http');

const app  = express();
const PORT = 3000;

// ------------------------------------------------------------
// KONFIGURASI
// Sesuaikan ESP32_IP dengan IP address ESP32-S3 kamu di jaringan WiFi
// Cek IP ESP32 di Serial Monitor saat pertama konek WiFi
// ------------------------------------------------------------
const ESP32_IP   = '192.168.1.100'; // GANTI dengan IP ESP32-S3 kamu
const FOTO_DIR   = path.join(__dirname, 'foto');

// Buat folder foto jika belum ada
if (!fs.existsSync(FOTO_DIR)) {
  fs.mkdirSync(FOTO_DIR);
}


// ============================================================
// MIDDLEWARE
// ============================================================

// CORS: izinkan request dari browser (website gallery)
app.use(cors());

// Parse JSON body
app.use(express.json());

// Static: serve file foto langsung dari folder foto/
// Akses via: http://localhost:3000/foto/CAM_001.jpg
app.use('/foto', express.static(FOTO_DIR));

// Static: serve file HTML, CSS, JS website
// Akses via: http://localhost:3000/esp32s3cam.html
app.use(express.static(__dirname));


// ============================================================
// KONFIGURASI MULTER (upload handler)
// Multer menangani penerimaan file dari ESP32-S3
// File disimpan langsung ke folder foto/
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FOTO_DIR);
  },
  filename: (req, file, cb) => {
    // Gunakan nama file yang dikirim ESP32, atau generate otomatis
    const originalName = file.originalname || generateFilename();
    cb(null, originalName);
  }
});

// Filter: hanya terima file gambar
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });


// ============================================================
// HELPER: Generate nama file otomatis (fallback)
// Format: CAM_001.jpg, CAM_002.jpg, dst.
// ============================================================
function generateFilename() {
  const files  = fs.readdirSync(FOTO_DIR).filter(f => f.endsWith('.jpg'));
  const nums   = files.map(f => parseInt(f.replace(/\D/g, '')) || 0);
  const next   = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CAM_${String(next).padStart(3, '0')}.jpg`;
}


// ============================================================
// ENDPOINT: GET /status
// Cek apakah ESP32-S3 online dengan mengirim HTTP GET ke ESP32.
// ESP32 harus punya endpoint GET / atau /ping yang balas 200 OK.
// Response: { online: true } atau { online: false }
// ============================================================
app.get('/status', (req, res) => {
  const options = {
    hostname: ESP32_IP,
    port: 80,
    path: '/ping',      // sesuaikan dengan endpoint ESP32 kamu
    method: 'GET',
    timeout: 3000
  };

  const ping = http.request(options, (r) => {
    res.json({ online: r.statusCode === 200 });
  });

  ping.on('error', () => {
    res.json({ online: false });
  });

  ping.on('timeout', () => {
    ping.destroy();
    res.json({ online: false });
  });

  ping.end();
});


// ============================================================
// ENDPOINT: GET /photos
// Kembalikan daftar semua file foto di folder foto/.
// Diurutkan ascending (oldest first berdasarkan nama file).
// Response: ["CAM_001.jpg", "CAM_002.jpg", ...]
// ============================================================
app.get('/photos', (req, res) => {
  try {
    const files = fs.readdirSync(FOTO_DIR)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .sort(); // ascending = oldest first (CAM_001 → CAM_002 → dst)

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read photos' });
  }
});


// ============================================================
// ENDPOINT: POST /upload
// Terima foto kiriman dari ESP32-S3.
// ESP32 kirim foto sebagai multipart/form-data dengan field "photo".
// File disimpan ke folder foto/.
// Response: { success: true, filename: "CAM_001.jpg" }
// ============================================================
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received' });
  }

  console.log(`[UPLOAD] Received: ${req.file.filename} (${req.file.size} bytes)`);
  res.json({ success: true, filename: req.file.filename });
});


// ============================================================
// ENDPOINT: DELETE /photos/:filename
// Hapus foto berdasarkan nama file.
// Response: { success: true } atau { error: "..." }
// ============================================================
app.delete('/photos/:filename', (req, res) => {
  const filename = req.params.filename;

  // Validasi: cegah path traversal (keamanan dasar)
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filepath = path.join(FOTO_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    fs.unlinkSync(filepath);
    console.log(`[DELETE] Removed: ${filename}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});


// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('============================================');
  console.log('  VOLCRA.LAB — ESP32-S3 Camera Server');
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  Gallery   : http://localhost:${PORT}/esp32s3cam.html`);
  console.log(`  ESP32 IP  : ${ESP32_IP}`);
  console.log('============================================');
});
