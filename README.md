ASYA SERA - KARAR DESTEK SİSTEMİ (KDS)

Bu proje, Asya Sera işletmesi için geliştirilmiş; üretim verilerini analiz eden, enflasyon ve maliyet simülasyonları yapan ve yöneticilere stratejik yatırım tavsiyeleri sunan (ROI, Nadas, Arz-Talep) web tabanlı bir Karar Destek Sistemidir. Uygulama Node.js ve Express kullanılarak, katı MVC (Model-View-Controller) mimarisine uygun olarak geliştirilmiştir.



PROJE AÇIKLAMASI

Geleneksel seracılıkta kararlar genellikle tecrübe veya tahmine dayalı alınır. Bu proje, bu süreci tamamen veriye ve matematiğe dayalı hale getirmeyi amaçlar. Sistem, geçmiş üretim verilerini ve güncel piyasa koşullarını (gübre, işçilik, enerji maliyetleri) işleyerek yöneticiye şu konularda destek olur:

Ekonomik Simülasyonlar: "Gübreye %35 zam gelirse karımız ne olur?" sorusunun cevabını anlık simülasyonlarla verir.

Yatırım Zekası: Yeni bir sera kurulumunun kendini kaç yılda amorti edeceğini (ROI) hesaplar.

Verimlilik Analizi: Hangi seranın (Büyük Blok vs Küçük Blok) metrekare başına daha fazla ciro ürettiğini kıyaslar.

Ürün Stratejisi: İki ürünü (Örn: Domates ve Karpuz) maliyet kalemlerine göre düelloya sokar ve hangisinin daha karlı olduğunu belirler.



SENARYO TANIMI

Projenin karar destek mekanizması, birbirine entegre edilmiş çok katmanlı iş kuralları ve analiz senaryoları üzerine inşa edilmiştir. Sistem, ilk olarak Toprak Verimliliği ve Nadas Yönetimi senaryosunu devreye sokarak, seçilen seranın geçmiş üretim verilerini analiz eder; eğer toprak yorgunluğu tespit edilirse, kullanıcıyı olası verim kaybına karşı uyararak nadasa bırakma veya alternatif ürün ekme stratejilerini finansal projeksiyonlarla birlikte sunar.

Bununla eş zamanlı çalışan Arz-Talep Dengeleme ve Depo Yönetimi modülü, geçmiş yılların satış ve talep verilerini mevcut depo stok durumuyla kıyaslayarak üreticiye "Stok Fazlası Riski" veya "Yüksek Talep Fırsatı" gibi akıllı üretim etiketleri atar ve gelecek sezon için en ideal üretim miktarını önerir. Finansal öngörü tarafında ise Dinamik Enflasyon ve Maliyet Simülasyonu devreye girer; yönetici, panel üzerindeki interaktif araçları kullanarak gübre, işçilik ve enerji gibi temel gider kalemlerine sanal zam oranları uyguladığında, sistem tüm üretim reçetelerini anlık olarak yeniden hesaplayarak net kâr üzerindeki erimeyi ve risk boyutunu görselleştirir.

Ayrıca sistem, Fiyat Kırılma Noktası Analizi ile bir ürünün zarar etmeye başlayacağı minimum taban satış fiyatını tespit ederek piyasa dalgalanmalarına karşı erken uyarı sağlar. Stratejik büyüme kararları için geliştirilen Yatırım Robotu, yeni sera kurulum maliyetlerini ve hedeflenen ürünün pazar değerini hesaplayarak yatırımın kendini amorti etme süresini (ROI) analiz ederken; Maliyet Düellosu senaryosu, iki farklı ürünü gider kalemleri bazında yan yana kıyaslayarak en düşük maliyetle en yüksek verimi sağlayacak ürünün seçilmesine olanak tanır.



KURULUM ADIMLARI

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

Projeyi İndirin: Github üzerinden projeyi klonlayın veya zip olarak indirin.

Paketleri Yükleyin: Terminali açın ve proje klasöründe şu komutu çalıştırın: npm install

Veritabanı Ayarları (.env): Ana dizinde .env adında bir dosya oluşturun ve .env.example dosyasındaki şablonu kullanarak kendi veritabanı bilgilerinizi (DB_HOST, DB_USER, DB_PASS) girin.

Başlatma: Terminalde şu komutu yazarak sunucuyu başlatın: node app.js

Erişim: Tarayıcınızda http://localhost:3000 adresine gidin.



API ENDPOİNT LİSTESİ

Uygulama, ön yüz ile haberleşmek için aşağıdaki RESTful servislerini kullanır:


Kimlik Doğrulama
POST /auth/login : Yönetici girişi kontrolü.
GET /auth/logout : Oturum kapatma.


Ana Veri ve Yönetim
GET /api/seralar : Tüm sera listesini ve aktif durumlarını getirir.
GET /api/urunler : Sistemde tanımlı ürünleri ve birim maliyetlerini getirir.,
POST /api/uretim : Yeni bir üretim planı oluşturur.


Analiz ve Karar Destek Servisleri
GET /api/analiz/dashboard : Ana sayfadaki KPI kartlarını ve özet grafikleri doldurur.
POST /api/analiz/simulasyon : Enflasyon slider verilerini alıp, tahmini yeni karı hesaplar.
GET /api/analiz/kiyasla : Seçilen iki senaryonun veya ürünün maliyetlerini karşılaştırır (Maliyet Düellosu).
GET /api/analiz/roi : Yatırım robotu için geri dönüş süresi hesaplamasını yapar.
GET /api/depo/durum : Arz-talep grafik verilerini ve sistem önerilerini (Artır/Azalt) getirir.


