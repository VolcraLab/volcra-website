// ============================================================
// VOLCRA.LAB — ESP32-S3 Camera Gallery
// script.js
//
// Fungsi utama:
// 1. checkESPStatus()  → cek status online/offline ESP32-S3
// 2. loadPhotos()      → ambil daftar foto dari server & render ke gallery
// 3. openLightbox()    → buka popup foto saat diklik
// 4. closeLightbox()   → tutup popup foto
// 5. deletePhoto()     → hapus foto via server
// 6. showToast()       → tampilkan notifikasi kecil
// ============================================================

// ------------------------------------------------------------
// KONFIGURASI
// Sesuaikan BASE_URL dengan URL server Node.js kamu saat jalan
// Saat development di localhost, port default adalah 3000
// ------------------------------------------------------------
const BASE_URL = 'http://localhost:3000';

// Interval cek status ESP32 (ms) — default 5 detik
const STATUS_INTERVAL = 5000;

// Interval refresh gallery (ms) — default 10 detik
const GALLERY_INTERVAL = 10000;


// ------------------------------------------------------------
// ELEMENT REFERENCES
// ------------------------------------------------------------
const galleryGrid   = document.getElementById('gallery-grid');
const emptyState    = document.getElementById('empty-state');
const photoCount    = document.getElementById('photo-count');
const espStatus     = document.getElementById('esp-status');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxName  = document.getElementById('lightbox-filename');
const btnDownload   = document.getElementById('btn-download');
const btnDelete     = document.getElementById('btn-delete');
const btnClose      = document.getElementById('btn-close');
const overlay       = document.getElementById('lightbox-overlay');
const toast         = document.getElementById('toast');
const logoWrapper   = document.getElementById('logo-wrapper');
const logoDropdown  = document.getElementById('logo-dropdown');


// Menyimpan nama file foto yang sedang dibuka di lightbox
let currentPhoto = null;


// Klik logo → toggle dropdown
logoWrapper.addEventListener('click', () => {
  const isVisible = logoDropdown.style.display === 'block';
  logoDropdown.style.display = isVisible ? 'none' : 'block';
});

// Klik di luar → tutup dropdown
document.addEventListener('click', (e) => {
  if (!logoWrapper.contains(e.target)) {
    logoDropdown.style.display = 'none';
  }
});


// ============================================================
// 1. CEK STATUS ESP32-S3
// Mengirim GET request ke endpoint /status di server.
// Server akan forward ping ke ESP32, lalu balas online/offline.
// Dot dan teks akan berubah sesuai status.
// ============================================================
async function checkESPStatus() {
  try {
    const res = await fetch(`${BASE_URL}/status`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (data.online) {
      statusDot.className  = 'status-dot online';
      statusText.textContent = 'Online';
    } else {
      statusDot.className  = 'status-dot offline';
      statusText.textContent = 'Offline';
    }
  } catch {
    // Jika server tidak bisa dijangkau
    statusDot.className  = 'status-dot offline';
    statusText.textContent = 'Offline';
  }
}


// ============================================================
// 2. LOAD & RENDER GALLERY
// Mengambil daftar foto dari server via GET /photos.
// Server mengembalikan array nama file foto di folder foto/.
// Foto diurutkan dari terlama dulu (oldest first).
// ============================================================
async function loadPhotos() {
  try {
    const res   = await fetch(`${BASE_URL}/photos`);
    const files = await res.json(); // array of filenames, e.g. ["CAM_001.jpg", "CAM_002.jpg"]

    // Urutkan ascending (oldest first) — server sudah sort, ini sebagai fallback
    files.sort();

    renderGallery(files);
  } catch {
    // Jika gagal ambil data, tampilkan empty state
    renderGallery([]);
  }
}


// ------------------------------------------------------------
// Render foto ke dalam grid gallery
// ------------------------------------------------------------
function renderGallery(files) {
  galleryGrid.innerHTML = '';

  if (files.length === 0) {
    emptyState.style.display = 'block';
    photoCount.textContent   = '0 photos';
    return;
  }

  emptyState.style.display = 'none';
  photoCount.textContent   = `${files.length} photo${files.length > 1 ? 's' : ''}`;

  files.forEach(filename => {
    const card = document.createElement('div');
    card.className = 'photo-card';

    // Klik card → buka lightbox
    card.addEventListener('click', () => openLightbox(filename));

    card.innerHTML = `
      <img src="${BASE_URL}/foto/${filename}" alt="${filename}" loading="lazy" />
      <div class="photo-overlay">
        <div class="photo-name">${filename}</div>
      </div>
    `;

    galleryGrid.appendChild(card);
  });
}


// ============================================================
// 3. BUKA LIGHTBOX
// Dipanggil saat foto diklik.
// Mengisi lightbox dengan foto yang dipilih + set tombol download & delete.
// ============================================================
function openLightbox(filename) {
  currentPhoto = filename;

  lightboxImg.src          = `${BASE_URL}/foto/${filename}`;
  lightboxName.textContent = filename;

  // Set href tombol download ke URL foto langsung
  btnDownload.href         = `${BASE_URL}/foto/${filename}`;
  btnDownload.download     = filename;

  lightbox.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // cegah scroll background
}


// ============================================================
// 4. TUTUP LIGHTBOX
// ============================================================
function closeLightbox() {
  lightbox.style.display = 'none';
  lightboxImg.src        = '';
  currentPhoto           = null;
  document.body.style.overflow = '';
}


// ============================================================
// 5. HAPUS FOTO
// Mengirim DELETE request ke server dengan nama file foto.
// Server akan hapus file dari folder foto/.
// Setelah berhasil, gallery di-refresh dan lightbox ditutup.
// ============================================================
async function deletePhoto() {
  if (!currentPhoto) return;

  const filename = currentPhoto;

  // Konfirmasi sebelum hapus
  if (!confirm(`Delete ${filename}?`)) return;

  try {
    const res = await fetch(`${BASE_URL}/photos/${filename}`, { method: 'DELETE' });

    if (res.ok) {
      showToast(`${filename} deleted`, 'success');
      closeLightbox();
      loadPhotos(); // refresh gallery
    } else {
      showToast('Failed to delete', 'error');
    }
  } catch {
    showToast('Server error', 'error');
  }
}


// ============================================================
// 6. TOAST NOTIFICATION
// Tampilkan notifikasi kecil di pojok kanan bawah.
// type: 'success' | 'error' | '' (default putih)
// duration: berapa ms toast tampil (default 3000ms)
// ============================================================
function showToast(message, type = '', duration = 3000) {
  toast.textContent  = message;
  toast.className    = `toast ${type} show`;

  setTimeout(() => {
    toast.className = 'toast';
  }, duration);
}


// ============================================================
// EVENT LISTENERS
// ============================================================

// Tombol tutup lightbox
btnClose.addEventListener('click', closeLightbox);

// Klik overlay (background gelap) → tutup lightbox
overlay.addEventListener('click', closeLightbox);

// Tombol hapus foto
btnDelete.addEventListener('click', deletePhoto);

// Tekan Escape → tutup lightbox
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});


// ============================================================
// INIT — Jalankan saat halaman pertama kali dibuka
// ============================================================
checkESPStatus();
loadPhotos();

// Auto refresh status ESP setiap STATUS_INTERVAL ms
setInterval(checkESPStatus, STATUS_INTERVAL);

// Auto refresh gallery setiap GALLERY_INTERVAL ms
// (agar foto baru dari ESP langsung muncul tanpa reload manual)
setInterval(loadPhotos, GALLERY_INTERVAL);
