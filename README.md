# Asya Sera - Karar Destek Sistemi (KDS)

Tarım/Sera işletmeleri için geliştirilmiş modern bir karar destek sistemi.

## 📁 Proje Yapısı (MVC Mimarisi)

```
kds/
├── config/
│   └── database.js          # Veritabanı bağlantı ayarları
├── controllers/
│   ├── apiController.js     # API iş mantığı (CRUD işlemleri)
│   ├── authController.js    # Kimlik doğrulama işlemleri
│   └── pageController.js    # Sayfa yönlendirmeleri
├── routes/
│   ├── apiRoutes.js         # API endpoint tanımları
│   └── pageRoutes.js        # Sayfa route tanımları
├── views/
│   ├── login.html           # Giriş sayfası
│   └── panel.html           # Ana panel sayfası
├── public/
│   ├── css/
│   │   ├── login.css        # Login sayfası stilleri
│   │   └── panel.css        # Panel sayfası stilleri
│   └── js/
│       └── panel.js         # Frontend JavaScript kodları
├── server.js                # Ana uygulama dosyası
└── package.json             # Proje bağımlılıkları
```

## 🚀 Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. MySQL veritabanını oluşturun (`kds` adında)

3. Sunucuyu başlatın:
```bash
node server.js
```

4. Tarayıcıda açın: `http://localhost:3000`

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** MySQL (mysql2)
- **Frontend:** HTML5, CSS3, JavaScript
- **Grafikler:** Chart.js
- **İkonlar:** Font Awesome 6

## 📊 Özellikler

- **Ana Panel:** Karlılık analizi, gider dağılımı, büyüme trendi grafikleri
- **Üretim Planlama:** Yıllık üretim raporları, bütçe dağılımı
- **Karar Analizleri:** Nadas simülasyonu, yatırım robotu, senaryo karşılaştırma, maliyet stres testi
- **Depo & Satış:** Talep/üretim analizi, gelecek üretim önerileri

## 🎨 Tasarım

- Modern ve temiz arayüz
- Tarım/Sera konseptine uygun yeşil renk paleti
- Responsive tasarım (mobil uyumlu)
- Profesyonel sidebar navigasyon

---
© 2025 Asya Sera - Tüm Hakları Saklıdır
