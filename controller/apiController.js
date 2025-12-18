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

// --- controller/apiController.js EN ALTINA (SON PARANTEZDEN ÖNCE) ---

// 4. İki Serayı Verimlilik (Ciro/m2) Açısından Karşılaştır
exports.seraKarsilastir = (req, res) => {
    const { sera1Id, sera2Id } = req.body;

    // Eğer seralar seçilmediyse hata dönmesin, uyarı dönsün
    if (!sera1Id || !sera2Id) {
        return res.json({ error: "Lütfen iki sera seçiniz." });
    }

    // DÜZELTME BURADA YAPILDI: 'buyukluk_m2' yerine 'alan_m2' kullanıldı.
    const sql = `
        SELECT 
            s.id, 
            s.sera_adi, 
            s.alan_m2, 
            IFNULL(SUM(up.kazanc_tl), 0) as toplam_gelir
        FROM seralar s
        LEFT JOIN uretim_planlari up ON s.id = up.sera_id
        WHERE s.id IN (?, ?)
        GROUP BY s.id
    `;

    db.query(sql, [sera1Id, sera2Id], (err, results) => {
        if (err) {
            // Hatanın detayını terminalde (Windsurf alt panelde) görmek için:
            console.log("Karşılaştırma SQL Hatası:", err); 
            res.status(500).json({ error: "Veritabanı hatası" });
            return;
        }

        // Sonuçları işle
        const analizSonucu = results.map(sera => {
            // 0'a bölme hatası olmasın diye kontrol
            const alan = sera.alan_m2 > 0 ? sera.alan_m2 : 1; 
            const verimlilik = sera.toplam_gelir / alan; 

            return {
                sera_adi: sera.sera_adi,
                verimlilik: verimlilik.toFixed(2)
            };
        });

        res.json(analizSonucu);
    });
};