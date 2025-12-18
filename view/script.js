let urunListesi = [];
let seraListesi = [];
let uretimVerileri = [];
let chartKar = null;   // Ana Panel Grafiği
let chartButce = null; // Üretim Paneli Grafiği

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initProduction();
    initAnaliz(); // <--- BUNU EKLE (Karar analizlerini yükler)
});

// === SAYFA GEÇİŞ YÖNETİMİ ===
function sayfaGoster(sayfaId) {
    document.querySelectorAll('.sayfa').forEach(div => div.style.display = 'none');
    document.getElementById('sayfa-' + sayfaId).style.display = 'block';
    
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    document.getElementById('link-' + sayfaId).classList.add('active');
}

// ==========================================
// 1. ANA PANEL FONKSİYONLARI
// ==========================================
function initDashboard() {
    // Ürünleri Çek
    fetch('/api/urunler').then(res => res.json()).then(data => {
        urunListesi = data;
        const opts = data.map(u => `<option value="${u.id}">${u.urun_adi}</option>`).join('');
        document.getElementById('urun-a').innerHTML = '<option value="0">Seçiniz...</option>' + opts;
        document.getElementById('urun-b').innerHTML = '<option value="0">Seçiniz...</option>' + opts;
        drawDashboardChart(data);
    });

    // Seraları Çek
    fetch('/api/seralar').then(res => res.json()).then(data => {
        seraListesi = data;
        const opts = data.map(s => `<option value="${s.id}">${s.sera_adi} (${s.alan_m2} m²)</option>`).join('');
        document.getElementById('sera-a').innerHTML = '<option value="0">Seçiniz...</option>' + opts;
        document.getElementById('sera-b').innerHTML = '<option value="0">Seçiniz...</option>' + opts;
    });
}

function drawDashboardChart(data) {
    const ctx = document.getElementById('karGrafigi').getContext('2d');
    const labels = data.map(u => u.urun_adi);
    const values = data.map(u => (u.verim_kg_m2 * u.satis_fiyati_tl) - u.maliyet_tl_m2);

    if(chartKar) chartKar.destroy();
    chartKar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'm² Başına Net Kar (TL)',
                data: values,
                backgroundColor: '#2e7d32',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function karsilastir() {
    const sA = seraListesi.find(s => s.id == document.getElementById('sera-a').value);
    const uA = urunListesi.find(u => u.id == document.getElementById('urun-a').value);
    const sB = seraListesi.find(s => s.id == document.getElementById('sera-b').value);
    const uB = urunListesi.find(u => u.id == document.getElementById('urun-b').value);

    if (!sA || !uA || !sB || !uB) { alert("Lütfen tüm seçimleri yapınız."); return; }

    const karA = (sA.alan_m2 * uA.verim_kg_m2 * uA.satis_fiyati_tl) - (sA.alan_m2 * uA.maliyet_tl_m2);
    const karB = (sB.alan_m2 * uB.verim_kg_m2 * uB.satis_fiyati_tl) - (sB.alan_m2 * uB.maliyet_tl_m2);

    document.getElementById('sonuc-a').innerHTML = `₺${karA.toLocaleString()}`;
    document.getElementById('sonuc-b').innerHTML = `₺${karB.toLocaleString()}`;
    
    const fark = Math.abs(karA - karB);
    const kazanan = karA > karB ? "Senaryo A" : "Senaryo B";
    document.getElementById('kazanan-bilgi').innerHTML = `Kazanan: <span style="color:green">${kazanan}</span> (+₺${fark.toLocaleString()} Fark)`;
}


// ==========================================
// 2. ÜRETİM PLANLAMA FONKSİYONLARI (DÜZELTİLDİ)
// ==========================================
function initProduction() {
    fetch('/api/uretim-gecmisi')
        .then(res => res.json())
        .then(data => {
            // VERİTABANINDAN GELEN VERİYİ DİREKT KULLAN (Formatlama yapma)
            // SQL zaten 'yil' sütununu gönderiyor, JS ile hesaplamaya çalışma!
            uretimVerileri = data;
            
            // Varsayılan olarak "Tümü" değil, "2025" değil, "Tümü" seçelim ki veri gelsin
            yilFiltrele('tumu'); 
        })
        .catch(err => console.error("Veri çekme hatası:", err));
}

function yilFiltrele(yil) {
    // 1. Buton Aktifliği
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    let btnId = (yil === 'tumu') ? 'btn-tumu' : 'btn-' + yil;
    const activeBtn = document.getElementById(btnId);
    if(activeBtn) activeBtn.classList.add('active');

    // 2. Filtreleme
    let filtrelenmis = [];
    if (yil === 'tumu') {
        filtrelenmis = uretimVerileri;
    } else {
        // String çevirimi yaparak garanti karşılaştırma
        filtrelenmis = uretimVerileri.filter(item => String(item.yil) == String(yil));
    }

    // 3. Ekranı Güncelle
    updateProductionUI(filtrelenmis);
}

function updateProductionUI(data) {
    const tableBody = document.getElementById('uretim-rapor-tablo');
    tableBody.innerHTML = '';
    
    let totalGider = 0;
    let totalGelir = 0;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Bu dönem için kayıt bulunamadı.</td></tr>';
    } else {
        data.forEach(item => {
            // Sayısal değerleri garantiye al
            let g = parseFloat(item.gider) || 0;
            let k = parseFloat(item.gelir) || 0;
            
            totalGider += g;
            totalGelir += k;

            let row = `
                <tr>
                    <td>${item.sera_adi || 'Sera X'}</td>
                    <td><b>${item.urun_adi || 'Belirsiz'}</b></td>
                    <td style="font-weight:bold; color:#555;">${item.yil}</td> <td style="color:#d32f2f">₺${g.toLocaleString()}</td>
                    <td style="color:#2e7d32">₺${k.toLocaleString()}</td>
                    <td><span style="background:#e8f5e9; color:green; padding:4px 8px; border-radius:4px; font-size:12px;">${item.durum || 'Tamamlandı'}</span></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    document.getElementById('toplam-gider').innerText = `₺${totalGider.toLocaleString()}`;
    document.getElementById('toplam-gelir').innerText = `₺${totalGelir.toLocaleString()}`;

    drawProductionChart(data);
}

function drawProductionChart(data) {
    const ctx = document.getElementById('butceGrafigi').getContext('2d');
    
    // Veri yoksa boş grafik
    if(!data || data.length === 0) {
        if(chartButce) chartButce.destroy();
        return;
    }

    // Seralara göre grupla
    const seralar = [...new Set(data.map(i => i.sera_adi || 'Bilinmiyor'))];
    const giderler = seralar.map(s => data.filter(i => (i.sera_adi || 'Bilinmiyor') === s).reduce((a,b)=> a+(parseFloat(b.gider)||0), 0));
    const gelirler = seralar.map(s => data.filter(i => (i.sera_adi || 'Bilinmiyor') === s).reduce((a,b)=> a+(parseFloat(b.gelir)||0), 0));

    if(chartButce) chartButce.destroy();
    chartButce = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: seralar,
            datasets: [
                { label: 'Gider', data: giderler, backgroundColor: '#ef5350', borderRadius:4 },
                { label: 'Gelir', data: gelirler, backgroundColor: '#66bb6a', borderRadius:4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}
// ==========================================
// 3. KARAR ANALİZLERİ FONKSİYONLARI
// ==========================================

function initAnaliz() {
    // Dropdownları doldurmak için mevcut listeleri kullanıyoruz
    // Eğer listeler boşsa (sayfa yeni açıldıysa) tekrar çekiyoruz
    if(urunListesi.length === 0 || seraListesi.length === 0) {
        fetch('/api/urunler').then(res=>res.json()).then(data => {
            urunListesi = data;
            analizDropdownDoldur();
        });
        fetch('/api/seralar').then(res=>res.json()).then(data => {
            seraListesi = data;
            analizDropdownDoldur();
        });
    } else {
        analizDropdownDoldur();
    }
}

function analizDropdownDoldur() {
    // Nadas Kısmı
    const seraOpts = seraListesi.map(s => `<option value="${s.id}">${s.sera_adi} (${s.alan_m2} m²)</option>`).join('');
    document.getElementById('nadas-sera-secimi').innerHTML = seraOpts;

    const urunOpts = urunListesi.filter(u=>u.id != 99).map(u => `<option value="${u.id}">${u.urun_adi}</option>`).join('');
    document.getElementById('nadas-urun-secimi').innerHTML = urunOpts;
    
    // Yatırım Kısmı
    document.getElementById('yatirim-urun').innerHTML = urunOpts;
}

// --- MODÜL 1: NADAS ANALİZİ ---
function analizNadas() {
    const seraId = document.getElementById('nadas-sera-secimi').value;
    const urunId = document.getElementById('nadas-urun-secimi').value;
    
    const sera = seraListesi.find(s => s.id == seraId);
    const urun = urunListesi.find(u => u.id == urunId);

    // Senaryo 1: HİÇ DURMADAN ÜRETİM (2 Yıl)
    // Yıllık Kar = (Alan * Verim * Fiyat) - (Alan * Maliyet)
    const yillikKar = (sera.alan_m2 * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (sera.alan_m2 * urun.maliyet_tl_m2);
    const senaryo1Toplam = yillikKar * 2; // 2 yıl üst üste üretim

    // Senaryo 2: 1 YIL NADAS + 1 YIL SÜPER VERİM (%40 artış)
    const nadasMaliyeti = 5000; // Bakım masrafı
    const superVerimKar = yillikKar * 1.40; // Dinlenmiş toprak bereketi
    const senaryo2Toplam = (-nadasMaliyeti) + superVerimKar;

    const sonucDiv = document.getElementById('nadas-sonuc');
    sonucDiv.style.display = 'block';

    let oneri = "";
    if (senaryo1Toplam > senaryo2Toplam) {
        oneri = `<b style="color:#d32f2f">ÖNERİ: Nadasa Bırakmayın!</b><br>
                 Sürekli üretim yapmak 2 yıl sonunda <b>₺${(senaryo1Toplam - senaryo2Toplam).toLocaleString()}</b> daha fazla kazandırıyor.`;
    } else {
        oneri = `<b style="color:#2e7d32">ÖNERİ: Kesinlikle Nadasa Bırakın!</b><br>
                 Toprağı dinlendirmek verimi patlatır ve 2 yıl sonunda size <b>₺${(senaryo2Toplam - senaryo1Toplam).toLocaleString()}</b> kar sağlar.`;
    }

    sonucDiv.innerHTML = `
        <strong>Senaryo A (Sürekli Üretim):</strong> ₺${senaryo1Toplam.toLocaleString()}<br>
        <strong>Senaryo B (Nadas + Verim):</strong> ₺${senaryo2Toplam.toLocaleString()}<br>
        <hr>
        ${oneri}
    `;
}

// --- MODÜL 2: YENİ YATIRIM ANALİZİ ---
function analizYatirim() {
    const tip = document.getElementById('yatirim-tipi').value;
    const urunId = document.getElementById('yatirim-urun').value;
    const urun = urunListesi.find(u => u.id == urunId);

    if(tip === "0") { alert("Lütfen sera tipi seçiniz!"); return; }

    // Sera Tipleri Verisi (Sabit Veri)
    let yatirimMaliyeti = 0;
    let alan = 0;
    let tipAdi = "";

    if(tip === "kucuk") { yatirimMaliyeti = 80000; alan = 200; tipAdi = "Küçük Boy Sera"; }
    else if(tip === "orta") { yatirimMaliyeti = 150000; alan = 500; tipAdi = "Orta Boy Sera"; }
    else if(tip === "buyuk") { yatirimMaliyeti = 400000; alan = 1000; tipAdi = "Büyük Boy Sera"; }

    // İşletme Hesabı (1 Yıllık)
    const yillikCiro = alan * urun.verim_kg_m2 * urun.satis_fiyati_tl;
    const yillikUretimMaliyeti = alan * urun.maliyet_tl_m2;
    const yillikNetKar = yillikCiro - yillikUretimMaliyeti;

    // Amortisman (Geri Dönüş Süresi)
    const ayOlarakDonus = (yatirimMaliyeti / (yillikNetKar / 12)).toFixed(1);
    const yilOlarakDonus = (yatirimMaliyeti / yillikNetKar).toFixed(1);

    const sonucDiv = document.getElementById('yatirim-sonuc');
    sonucDiv.style.display = 'block';

    let yorum = "";
    let renk = "";
    
    // Yatırım Mantıklı mı? (Genelde 3 yıldan kısa ise çok iyidir)
    if(yilOlarakDonus < 2) {
        yorum = "MÜKEMMEL YATIRIM! 🚀";
        renk = "green";
    } else if (yilOlarakDonus < 4) {
        yorum = "Mantıklı Yatırım (Standart).";
        renk = "#f57c00";
    } else {
        yorum = "RİSKLİ YATIRIM! Geri dönüş çok uzun.";
        renk = "red";
    }

    sonucDiv.innerHTML = `
        <b>Seçim:</b> ${tipAdi} + ${urun.urun_adi}<br>
        <b>Yatırım Maliyeti:</b> ₺${yatirimMaliyeti.toLocaleString()}<br>
        <b>Tahmini Yıllık Net Kar:</b> ₺${yillikNetKar.toLocaleString()}<br>
        <hr>
        <b>Amortisman Süresi:</b> ${yilOlarakDonus} Yıl (${ayOlarakDonus} Ay)<br>
        <b style="color:${renk}; font-size:16px;">SONUÇ: ${yorum}</b>
    `;
}
// --- MODÜL 3: AKILLI ÜRÜN TAVSİYESİ ---
function analizTavsiye() {
    const sonucDiv = document.getElementById('tavsiye-sonuc');
    sonucDiv.style.display = 'block';
    sonucDiv.innerHTML = '<b><i class="fas fa-spinner fa-spin"></i> Analiz yapılıyor...</b>';

    // Biraz gecikme verelim ki "hesaplıyor" hissi oluşsun
    setTimeout(() => {
        let rapor = '<ul style="list-style:none; padding:0;">';
        
        // Her sera için döngüye gir
        seraListesi.forEach(sera => {
            let enIyiUrun = null;
            let maxKar = -9999999;

            // Bu sera için tüm ürünleri dene
            urunListesi.filter(u => u.id != 99).forEach(urun => {
                let kar = (sera.alan_m2 * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (sera.alan_m2 * urun.maliyet_tl_m2);
                if (kar > maxKar) {
                    maxKar = kar;
                    enIyiUrun = urun;
                }
            });

            rapor += `
                <li style="margin-bottom:8px; border-bottom:1px solid #e1bee7; padding-bottom:5px;">
                    <b>${sera.sera_adi}:</b> İçin en uygun ürün <span style="color:#9c27b0; font-weight:bold;">${enIyiUrun.urun_adi}</span> 
                    <br><span style="font-size:12px; color:#666;">Tahmini Yıllık Kar: ₺${maxKar.toLocaleString()}</span>
                </li>
            `;
        });

        rapor += '</ul>';
        sonucDiv.innerHTML = rapor;
    }, 500);
}

// --- MODÜL 4: GELİŞMİŞ STRES TESTİ (PARAMETRİK) ---
function analizStres() {
    // 1. Slider Değerlerini Al
    const artisGubre = parseInt(document.getElementById('slider-gubre').value);
    const artisIscilik = parseInt(document.getElementById('slider-iscilik').value);
    const artisEnerji = parseInt(document.getElementById('slider-enerji').value);
    const artisLojistik = parseInt(document.getElementById('slider-lojistik').value);

    // Etiketleri Güncelle
    document.getElementById('val-gubre').innerText = artisGubre;
    document.getElementById('val-iscilik').innerText = artisIscilik;
    document.getElementById('val-enerji').innerText = artisEnerji;
    document.getElementById('val-lojistik').innerText = artisLojistik;

    // 2. Mevcut Durumu Hesapla (Baz Senaryo)
    let toplamCiro = 0;
    let toplamMaliyet = 0;

    // Veritabanındaki tüm seralar için "En İyi Ürün" varsayımıyla veya mevcut durumla hesapla
    // Basitlik için: Her sera için Domates (veya listedeki ilk ürün) ekiliymiş gibi baz alalım
    const bazUrun = urunListesi[0] || {verim_kg_m2:0, satis_fiyati_tl:0, maliyet_tl_m2:0}; 

    seraListesi.forEach(sera => {
        let ciro = sera.alan_m2 * bazUrun.verim_kg_m2 * bazUrun.satis_fiyati_tl;
        let maliyet = sera.alan_m2 * bazUrun.maliyet_tl_m2;
        
        toplamCiro += ciro;
        toplamMaliyet += maliyet;
    });

    const normalKar = toplamCiro - toplamMaliyet;

    // 3. MALİYETİ BİLEŞENLERİNE AYIR (VARSAYIM ORANLARI)
    // Toplam maliyetin içindeki paylar:
    const payGubre = toplamMaliyet * 0.35;   // %35
    const payIscilik = toplamMaliyet * 0.30; // %30
    const payEnerji = toplamMaliyet * 0.20;  // %20
    const payLojistik = toplamMaliyet * 0.15;// %15

    // 4. ZAMLARI UYGULA
    const yeniGubre = payGubre * (1 + artisGubre / 100);
    const yeniIscilik = payIscilik * (1 + artisIscilik / 100);
    const yeniEnerji = payEnerji * (1 + artisEnerji / 100);
    const yeniLojistik = payLojistik * (1 + artisLojistik / 100);

    const yeniToplamMaliyet = yeniGubre + yeniIscilik + yeniEnerji + yeniLojistik;
    const stresliKar = toplamCiro - yeniToplamMaliyet;

    // 5. SONUCU EKRANA BAS
    document.getElementById('normal-kar').innerText = `₺${normalKar.toLocaleString()}`;
    const stresliKarElement = document.getElementById('stresli-kar');
    stresliKarElement.innerText = `₺${stresliKar.toLocaleString()}`;

    // Renk ve Mesaj Yönetimi
    const degisimDiv = document.getElementById('kar-degisim');
    if (stresliKar < 0) {
        stresliKarElement.style.color = 'red';
        stresliKarElement.innerText += " (ZARAR!)";
        degisimDiv.innerHTML = "⚠️ Dikkat! İşletme zarara girdi.";
    } else {
        stresliKarElement.style.color = '#d32f2f';
        // Kar ne kadar eridi?
        const erime = normalKar - stresliKar;
        degisimDiv.innerHTML = `Maliyet artışı karınızı <b>₺${erime.toLocaleString()}</b> eritti.`;
    }
}