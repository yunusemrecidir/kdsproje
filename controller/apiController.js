const db = require('../model/db'); // Veritabanı bağlantısını modelden çağırıyoruz

// 1. Ürün Listesini Getir (Analizler ve Dropdownlar için)
exports.getUrunler = (req, res) => {
    db.query('SELECT * FROM urunler', (err, result) => {
        if (err) {
            console.log("Ürün çekme hatası:", err);
            res.status(500).json([]);
        } else {
            res.json(result || []);
        }
    });
};

// 2. Sera Listesini Getir (Analizler ve Dropdownlar için)
exports.getSeralar = (req, res) => {
    db.query('SELECT * FROM seralar', (err, result) => {
        if (err) {
            console.log("Sera çekme hatası:", err);
            res.status(500).json([]);
        } else {
            res.json(result || []);
        }
    });
};

// 3. Üretim Geçmişini Getir (Tablo ve Grafikler için)
exports.getUretimGecmisi = (req, res) => {
    // Hatırlarsan tarihi silip 'yil' sütunu eklemiştik, sorguyu ona göre yazdım.
    const sql = `
        SELECT 
            up.id,
            s.sera_adi,
            u.urun_adi,
            IFNULL(up.maliyet_tl, 0) as gider,
            IFNULL(up.kazanc_tl, 0) as gelir,
            up.yil,
            up.durum
        FROM uretim_planlari up
        LEFT JOIN seralar s ON up.sera_id = s.id
        LEFT JOIN urunler u ON up.urun_id = u.id
        ORDER BY up.yil DESC
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("SQL HATASI:", err);
            res.json([]);
        } else {
            res.json(result);
        }
    });
};