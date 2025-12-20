const db = require('../model/database');

// 1. Ürün Listesini Getir
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

// 2. Sera Listesini Getir
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

// 3. Üretim Geçmişini Getir
exports.getUretimGecmisi = (req, res) => {
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

// 4. İki Serayı Verimlilik Açısından Karşılaştır
exports.seraKarsilastir = (req, res) => {
    const { sera1Id, sera2Id } = req.body;

    if (!sera1Id || !sera2Id) {
        return res.json({ error: "Lütfen iki sera seçiniz." });
    }

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
            console.log("Karşılaştırma SQL Hatası:", err); 
            res.status(500).json({ error: "Veritabanı hatası" });
            return;
        }

        const analizSonucu = results.map(sera => {
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

// 5. Depo ve Satış Verilerini Getir
exports.getDepoSatis = (req, res) => {
    const query = `
        SELECT ds.*, u.urun_adi 
        FROM depo_satis ds 
        JOIN urunler u ON ds.urun_id = u.id 
        ORDER BY ds.yil DESC, ds.urun_id ASC`;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// 6. Arz-Talep Uçurumu Grafiği için Veri Getir (Yıl Filtreli)
exports.getArzTalep = (req, res) => {
    const yil = req.query.yil;
    
    let query = '';
    let params = [];
    
    if (yil && yil !== 'tumu') {
        // Belirli bir yıl seçilmişse
        query = `
            SELECT 
                u.urun_adi,
                SUM(ds.gelen_talep_ton) as toplam_talep,
                SUM(ds.toplam_uretim_ton) as toplam_uretim
            FROM depo_satis ds
            JOIN urunler u ON ds.urun_id = u.id
            WHERE ds.yil = ?
            GROUP BY ds.urun_id, u.urun_adi
            ORDER BY u.urun_adi ASC`;
        params = [yil];
    } else {
        // Tüm yılların toplamı
        query = `
            SELECT 
                u.urun_adi,
                SUM(ds.gelen_talep_ton) as toplam_talep,
                SUM(ds.toplam_uretim_ton) as toplam_uretim
            FROM depo_satis ds
            JOIN urunler u ON ds.urun_id = u.id
            GROUP BY ds.urun_id, u.urun_adi
            ORDER BY u.urun_adi ASC`;
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Arz-Talep SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 7. Depo Satış Yıllarını Getir
exports.getDepoYillar = (req, res) => {
    const query = `SELECT DISTINCT yil FROM depo_satis ORDER BY yil DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Yıl Listesi SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 8. En Çok Kazandıran Ürünler (Gelir Dağılımı)
exports.getEnCokKazandiranUrunler = (req, res) => {
    const query = `
        SELECT 
            u.urun_adi,
            SUM(up.kazanc_tl) as toplam_kazanc
        FROM uretim_planlari up
        JOIN urunler u ON up.urun_id = u.id
        GROUP BY up.urun_id, u.urun_adi
        ORDER BY toplam_kazanc DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("En Çok Kazandıran SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 9. Yıllık Finansal Trend (Gelir vs Gider)
exports.getFinansalTrend = (req, res) => {
    const query = `
        SELECT 
            yil,
            SUM(maliyet_tl) as toplam_gider,
            SUM(kazanc_tl) as toplam_gelir
        FROM uretim_planlari
        GROUP BY yil
        ORDER BY yil ASC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Finansal Trend SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 10. Sera Verimlilik Ligi (Metrekare Başına Ciro)
exports.getSeraVerimlilik = (req, res) => {
    const query = `
        SELECT 
            s.sera_adi,
            IFNULL(SUM(up.kazanc_tl), 0) as toplam_kazanc,
            s.alan_m2,
            ROUND(IFNULL(SUM(up.kazanc_tl), 0) / IFNULL(NULLIF(s.alan_m2, 0), 1), 2) as verimlilik_skoru
        FROM seralar s
        LEFT JOIN uretim_planlari up ON s.id = up.sera_id
        GROUP BY s.id, s.sera_adi, s.alan_m2
        ORDER BY verimlilik_skoru DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Sera Verimlilik SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 11. Karlılık Analizi (ROI & Kar Marjı)
exports.getKarlilikAnalizi = (req, res) => {
    const query = `
        SELECT 
            u.urun_adi,
            s.sera_adi,
            up.yil,
            up.kazanc_tl,
            up.maliyet_tl,
            ROUND(
                CASE 
                    WHEN up.maliyet_tl = 0 OR up.maliyet_tl IS NULL THEN 0
                    ELSE ((up.kazanc_tl - up.maliyet_tl) / up.maliyet_tl) * 100
                END, 2
            ) as kar_marji
        FROM uretim_planlari up
        INNER JOIN urunler u ON up.urun_id = u.id
        INNER JOIN seralar s ON up.sera_id = s.id
        ORDER BY kar_marji DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Karlılık Analizi SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results || []);
    });
};

// 12. Ürün Detay (Risk Analizi için)
exports.getUrunDetay = (req, res) => {
    const urunId = req.params.id;
    const query = `
        SELECT 
            id,
            urun_adi,
            maliyet_tl_m2,
            satis_fiyati_tl,
            verim_kg_m2
        FROM urunler
        WHERE id = ?`;
    
    db.query(query, [urunId], (err, results) => {
        if (err) {
            console.error("Ürün Detay SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Ürün bulunamadı" });
        }
        res.json(results[0]);
    });
};

// 13. Genel Finans Durumu (Enflasyon Analizi için)
exports.getGenelFinansDurumu = (req, res) => {
    const query = `
        SELECT 
            SUM(maliyet_tl) as toplam_maliyet,
            SUM(kazanc_tl) as toplam_gelir
        FROM uretim_planlari`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Genel Finans SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results[0] || { toplam_maliyet: 0, toplam_gelir: 0 });
    });
};

// 14. Finansal Özet (Merkezi Hesaplama - Single Source of Truth)
exports.getFinansalOzet = (req, res) => {
    const query = `
        SELECT 
            IFNULL(SUM(maliyet_tl), 0) as toplam_gider,
            IFNULL(SUM(kazanc_tl), 0) as toplam_gelir,
            IFNULL(SUM(kazanc_tl), 0) - IFNULL(SUM(maliyet_tl), 0) as net_kar
        FROM uretim_planlari`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Finansal Özet SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results[0] || { toplam_gider: 0, toplam_gelir: 0, net_kar: 0 });
    });
};
