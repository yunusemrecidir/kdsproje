const express = require('express');
const path = require('path');
const app = express();

// Route dosyaları
const apiRoutes = require('./routes/apiRoutes');
const pageRoutes = require('./routes/pageRoutes');

// Middleware ayarları
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));  // HTML dosyaları
app.use(express.static(path.join(__dirname, 'views')));   // CSS dosyaları
app.use(express.static(__dirname));                        // Root dizindeki JS dosyaları (panel.js)

// Sayfa yönlendirmeleri
app.use('/', pageRoutes);

// API yönlendirmeleri
app.use('/api', apiRoutes);

// Sunucuyu Başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;
