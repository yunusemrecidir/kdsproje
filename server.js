const express = require('express');
const path = require('path');
const db = require('./model/db'); // Veritabanı bağlantısı
const app = express();

// Yeni oluşturduğumuz rota dosyasını çağırıyoruz
const apiRoutes = require('./routes/apiRoutes');

// Gerekli ayarlar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View klasöründeki dosyalara (HTML, CSS, JS) erişim izni veriyoruz
app.use(express.static(path.join(__dirname, 'view')));

// --- SAYFA YÖNLENDİRMELERİ ---
// Giriş sayfası
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'login.html'));
});

// Panel sayfası
app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'panel.html'));
});

// --- GİRİŞ İŞLEMİ (Bunu silmedik, aynen çalışıyor) ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM yoneticiler WHERE kullanici_adi = ? AND sifre = ?', [username, password], (err, results) => {
        if (err) {
            console.log(err);
            res.send('<script>alert("Veritabanı hatası!"); window.location.href="/";</script>');
        } else if (results && results.length > 0) {
            res.redirect('/panel');
        } else {
            res.send('<script>alert("Hatalı Kullanıcı Adı veya Şifre!"); window.location.href="/";</script>');
        }
    });
});

// --- API YOLLARI (MVC YAPISI) ---
// /api ile başlayan tüm istekleri routes klasörüne yönlendiriyoruz
app.use('/api', apiRoutes);

// Sunucuyu Başlat
app.listen(3000, () => {
    console.log('Sunucu çalışıyor: http://localhost:3000');
});

// Depo ve Satış verilerini getiren API
app.get('/api/depo-satis', (req, res) => {
    const query = `
        SELECT ds.*, u.urun_adi 
        FROM depo_satis ds 
        JOIN urunler u ON ds.urun_id = u.id 
        ORDER BY ds.yil DESC, ds.urun_id ASC`;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});