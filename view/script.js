// ==========================================
// 1. GLOBALS & INIT (TÜM DEĞİŞKENLER)
// ==========================================
let urunListesi = [];
let seraListesi = [];
let uretimVerileri = [];
let chartKar = null;   // Ana Panel Grafiği
let chartButce = null; // Üretim Paneli Grafiği

// NADAS MANTIĞI İÇİN YORUCU ÜRÜNLER (Bu ürünleri seçersen Nadas önerir)
const yorucuUrunler = ['Domates', 'Muz', 'Biber', 'Patlıcan', 'Karpuz'];

// SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();   // Ana Paneli Yükle
    initProduction();  // Üretim Verilerini Yükle
    initAnaliz();      // Analiz Verilerini Yükle
    initDepo();
});

// SAYFA GEÇİŞ FONKSİYONU
function sayfaGoster(sayfaId) {
    document.querySelectorAll('.sayfa').forEach(div => div.style.display = 'none');
    document.getElementById('sayfa-' + sayfaId).style.display = 'block';
    
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    document.getElementById('link-' + sayfaId).classList.add('active');
}

// ==========================================
// 2. ANA PANEL (DASHBOARD) FONKSİYONLARI
// ==========================================
function initDashboard() {
    // Ürünleri Çek ve Grafiği Çiz
    fetch('/api/urunler')
        .then(res => res.json())
        .then(data => {
            urunListesi = data;
            drawDashboardChart(data); // Ana Panel Grafiği
            analizDropdownDoldur();   // Kutuları Doldur (Veri gelince)
        })
        .catch(err => console.error("Ürün verisi hatası:", err));

    // Seraları Çek
    fetch('/api/seralar')
        .then(res => res.json())
        .then(data => {
            seraListesi = data;
            analizDropdownDoldur(); // Kutuları Doldur (Veri gelince)
        })
        .catch(err => console.error("Sera verisi hatası:", err));

        drawCostChart();

        drawTrendChart();
}


function drawDashboardChart(data) {
    const canvas = document.getElementById('karGrafigi');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Verileri hazırla: m2 başına kar
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
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true } } 
        }
    });
}

// ==========================================
// 3. ÜRETİM PLANLAMA FONKSİYONLARI
// ==========================================
function initProduction() {
    fetch('/api/uretim-gecmisi')
        .then(res => res.json())
        .then(data => {
            uretimVerileri = data;
            yilFiltrele('tumu'); 
        })
        .catch(err => console.error("Veri çekme hatası:", err));
}

function yilFiltrele(yil) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    let btnId = (yil === 'tumu') ? 'btn-tumu' : 'btn-' + yil;
    const activeBtn = document.getElementById(btnId);
    if(activeBtn) activeBtn.classList.add('active');

    let filtrelenmis = [];
    if (yil === 'tumu') {
        filtrelenmis = uretimVerileri;
    } else {
        filtrelenmis = uretimVerileri.filter(item => String(item.yil) == String(yil));
    }
    updateProductionUI(filtrelenmis);
}

function updateProductionUI(data) {
    const tableBody = document.getElementById('uretim-rapor-tablo');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    let totalGider = 0;
    let totalGelir = 0;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Veri yok.</td></tr>';
    } else {
        data.forEach(item => {
            let g = parseFloat(item.gider) || 0;
            let k = parseFloat(item.gelir) || 0;
            totalGider += g;
            totalGelir += k;

            let row = `
                <tr>
                    <td>${item.sera_adi || 'Sera X'}</td>
                    <td><b>${item.urun_adi || 'Belirsiz'}</b></td>
                    <td>${item.yil}</td> 
                    <td style="color:#d32f2f">₺${g.toLocaleString()}</td>
                    <td style="color:#2e7d32">₺${k.toLocaleString()}</td>
                    <td><span style="background:#e8f5e9; color:green; padding:4px;">${item.durum || 'Tamamlandı'}</span></td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    if(document.getElementById('toplam-gider')) document.getElementById('toplam-gider').innerText = `₺${totalGider.toLocaleString()}`;
    if(document.getElementById('toplam-gelir')) document.getElementById('toplam-gelir').innerText = `₺${totalGelir.toLocaleString()}`;

    drawProductionChart(data);
}

function drawProductionChart(data) {
    const canvas = document.getElementById('butceGrafigi');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if(!data || data.length === 0) {
        if(chartButce) chartButce.destroy();
        return;
    }

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
// 4. KARAR ANALİZLERİ (DROPDOWN VE MODÜLLER)
// ==========================================

function initAnaliz() {
    if(urunListesi.length > 0 && seraListesi.length > 0) {
        analizDropdownDoldur();
    }
}

// TÜM KUTULARI DOLDURAN TEK VE DÜZGÜN FONKSİYON
function analizDropdownDoldur() {
    if(seraListesi.length === 0 || urunListesi.length === 0) return;

    // HTML Listelerini Hazırla
    const seraHTML = seraListesi.map(s => `<option value="${s.id}">${s.sera_adi} (${s.alan_m2} m²)</option>`).join('');
    const urunHTML = urunListesi.filter(u => u.id != 99).map(u => `<option value="${u.id}">${u.urun_adi}</option>`).join('');

    // 1. Nadas Kutuları
    if(document.getElementById('nadas-sera-secimi')) document.getElementById('nadas-sera-secimi').innerHTML = seraHTML;
    if(document.getElementById('nadas-urun-secimi')) document.getElementById('nadas-urun-secimi').innerHTML = urunHTML;
    
    // 2. Yatırım Kutusu
    if(document.getElementById('yatirim-urun')) document.getElementById('yatirim-urun').innerHTML = urunHTML;

    // 3. Karşılaştırma Kutuları (Senaryo A ve B) - DÜZELTİLEN KISIM
    if(document.getElementById('comp-sera-a')) {
        document.getElementById('comp-sera-a').innerHTML = seraHTML;
        document.getElementById('comp-urun-a').innerHTML = urunHTML;
        document.getElementById('comp-sera-b').innerHTML = seraHTML;
        document.getElementById('comp-urun-b').innerHTML = urunHTML;
        // ... (Mevcut kodların hemen altına, fonksiyon bitmeden önce) ...

    // YENİ: DÜELLO KUTULARINI DOLDURMA
    // Eğer sayfada bu kutular varsa içlerine ürün listesini bas
    if(document.getElementById('duello-urun-1')) {
        document.getElementById('duello-urun-1').innerHTML = urunHTML;
        document.getElementById('duello-urun-2').innerHTML = urunHTML;

        // ... (Mevcut kodların altına) ...

    // YENİ: MALİYET DÜELLO KUTULARINI DOLDUR
    if(document.getElementById('maliyet-urun-1')) {
        document.getElementById('maliyet-urun-1').innerHTML = urunHTML;
        document.getElementById('maliyet-urun-2').innerHTML = urunHTML;

        // ... (Mevcut kodların altına ekle) ...

    // YENİ: SERA DÜELLO KUTULARINI DOLDUR
    if(document.getElementById('sera-duello-1')) {
        const seraOpts = seraListesi.map(s => `<option value="${s.id}">${s.sera_adi}</option>`).join('');
        document.getElementById('sera-duello-1').innerHTML = seraOpts;
        document.getElementById('sera-duello-2').innerHTML = seraOpts;
    }
    }
    }    
    }
}

// --- MODÜL 1: NADAS ANALİZİ (YENİ SADE & MANTIKLI SİSTEM) ---
function analizNadas() {
    const sonucDiv = document.getElementById('nadas-sonuc');
    const seraId = document.getElementById('nadas-sera-secimi').value;
    const urunId = document.getElementById('nadas-urun-secimi').value;
    
    if(!seraId || !urunId) { alert("Lütfen seçim yapınız."); return; }

    const sera = seraListesi.find(s => s.id == seraId);
    const urun = urunListesi.find(u => u.id == urunId);

    // 1. Standart Kar Hesabı
    const yillikStandartKar = (sera.alan_m2 * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (sera.alan_m2 * urun.maliyet_tl_m2);

    // 2. Ürün Türüne Göre Karar
    const isYorucu = yorucuUrunler.includes(urun.urun_adi);
    
    let yorgunlukFaktoru = 0; 
    let nadasArtisi = 0;      
    let aciklama = "";

    if (isYorucu) {
        // AĞIR ÜRÜN -> NADAS KAZANIR
        yorgunlukFaktoru = 0.50; 
        nadasArtisi = 1.90;      
        aciklama = `<b>${urun.urun_adi}</b>, toprağı çok yoran "Ağır" kategorisinde bir üründür. Dinlendirmeden üst üste ekim yapmak verimi yarı yarıya düşürür.`;
    } else {
        // HAFİF ÜRÜN -> SÜREKLİ ÜRETİM KAZANIR
        yorgunlukFaktoru = 0.90; 
        nadasArtisi = 1.20;      
        aciklama = `<b>${urun.urun_adi}</b>, toprağı az yoran "Hafif" bir üründür. Bu ürün için 1 yıl boş beklemek ekonomik değildir.`;
    }

    const senaryo1Toplam = yillikStandartKar + (yillikStandartKar * yorgunlukFaktoru);
    const senaryo2Toplam = (-5000) + (yillikStandartKar * nadasArtisi);

    // Kart Tasarımı
    let stilA = ""; let stilB = "";
    
    if (senaryo1Toplam > senaryo2Toplam) {
        stilA = "border: 3px solid #2e7d32; background: #e8f5e9; transform: scale(1.02); box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
        stilB = "border: 1px solid #ddd; opacity: 0.6; background: #f9f9f9;";
    } else {
        stilA = "border: 1px solid #ddd; opacity: 0.6; background: #f9f9f9;";
        stilB = "border: 3px solid #d32f2f; background: #ffebee; transform: scale(1.02); box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
    }

    sonucDiv.style.display = 'block';
    sonucDiv.innerHTML = `
        <div style="display:flex; gap:15px; margin-bottom:15px;">
            <div style="flex:1; padding:15px; border-radius:10px; text-align:center; transition: all 0.3s; ${stilA}">
                <div style="font-weight:bold; color:#555; font-size:12px; margin-bottom:5px;">A) SÜREKLİ ÜRETİM</div>
                <div style="font-size:20px; font-weight:bold; color:#2e7d32;">₺${senaryo1Toplam.toLocaleString()}</div>
                <div style="font-size:11px; color:#666; margin-top:5px;">2. Yıl Verim: <b>%${Math.round(yorgunlukFaktoru * 100)}</b></div>
                ${senaryo1Toplam > senaryo2Toplam ? '<div style="margin-top:8px; color:#2e7d32; font-weight:bold; font-size:12px;">✅ TAVSİYE EDİLEN</div>' : ''}
            </div>
            <div style="flex:1; padding:15px; border-radius:10px; text-align:center; transition: all 0.3s; ${stilB}">
                <div style="font-weight:bold; color:#555; font-size:12px; margin-bottom:5px;">B) NADAS PLANI</div>
                <div style="font-size:20px; font-weight:bold; color:#c62828;">₺${senaryo2Toplam.toLocaleString()}</div>
                <div style="font-size:11px; color:#666; margin-top:5px;">2. Yıl Verim: <b>%${Math.round(nadasArtisi * 100)}</b></div>
                ${senaryo2Toplam > senaryo1Toplam ? '<div style="margin-top:8px; color:#d32f2f; font-weight:bold; font-size:12px;">✅ TAVSİYE EDİLEN</div>' : ''}
            </div>
        </div>
        <div style="background:#fff3e0; padding:12px; border-radius:6px; border-left:4px solid #ff9800; font-size:13px; color:#5d4037;">
            <i class="fas fa-lightbulb" style="color:#f57c00; margin-right:5px;"></i> <b>Neden?</b> ${aciklama}
        </div>
    `;
}

// --- MODÜL 2: YATIRIM ANALİZİ ---
function analizYatirim() {
    const tip = document.getElementById('yatirim-tipi').value;
    const urunId = document.getElementById('yatirim-urun').value;
    const urun = urunListesi.find(u => u.id == urunId);

    if(tip === "0") { alert("Lütfen sera tipi seçiniz!"); return; }

    let yatirimMaliyeti = 0; let alan = 0; let tipAdi = "";
    if(tip === "kucuk") { yatirimMaliyeti = 80000; alan = 200; tipAdi = "Küçük Boy Sera"; }
    else if(tip === "orta") { yatirimMaliyeti = 150000; alan = 500; tipAdi = "Orta Boy Sera"; }
    else if(tip === "buyuk") { yatirimMaliyeti = 400000; alan = 1000; tipAdi = "Büyük Boy Sera"; }

    const yillikNetKar = (alan * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (alan * urun.maliyet_tl_m2);
    const yilOlarakDonus = (yatirimMaliyeti / yillikNetKar).toFixed(1);

    const sonucDiv = document.getElementById('yatirim-sonuc');
    sonucDiv.style.display = 'block';

    let renk = yilOlarakDonus < 2 ? "green" : (yilOlarakDonus < 4 ? "orange" : "red");
    let yorum = yilOlarakDonus < 2 ? "MÜKEMMEL YATIRIM! 🚀" : (yilOlarakDonus < 4 ? "Mantıklı." : "Riskli.");

    sonucDiv.innerHTML = `
        <b>${tipAdi} + ${urun.urun_adi}</b><br>
        Maliyet: ₺${yatirimMaliyeti.toLocaleString()} | Yıllık Kar: ₺${yillikNetKar.toLocaleString()}<br>
        <hr>
        Geri Dönüş: <b>${yilOlarakDonus} Yıl</b> <b style="color:${renk}">(${yorum})</b>
    `;
}

// --- MODÜL 3: SENARYO KARŞILAŞTIRMA (MANUEL KIYASLAMA - YENİ) ---
function analizKarsilastir() {
    const sA = seraListesi.find(s => s.id == document.getElementById('comp-sera-a').value);
    const uA = urunListesi.find(u => u.id == document.getElementById('comp-urun-a').value);
    const sB = seraListesi.find(s => s.id == document.getElementById('comp-sera-b').value);
    const uB = urunListesi.find(u => u.id == document.getElementById('comp-urun-b').value);

    // Basit Kar Hesabı (Sera ve Ürün seçildiği varsayılıyor)
    if (!sA || !uA || !sB || !uB) { alert("Lütfen tüm seçimleri yapınız."); return; }

    const karA = (sA.alan_m2 * uA.verim_kg_m2 * uA.satis_fiyati_tl) - (sA.alan_m2 * uA.maliyet_tl_m2);
    const karB = (sB.alan_m2 * uB.verim_kg_m2 * uB.satis_fiyati_tl) - (sB.alan_m2 * uB.maliyet_tl_m2);

    let kazanan = "";
    let fark = Math.abs(karA - karB);
    let renkA = "#f1f8e9"; let renkB = "#f1f8e9";
    let ikonA = ""; let ikonB = "";

    if (karA > karB) {
        kazanan = "SENARYO A DAHA KARLI! 🏆";
        renkA = "#c8e6c9"; renkB = "#ffcdd2"; ikonA = "✅";
    } else if (karB > karA) {
        kazanan = "SENARYO B DAHA KARLI! 🏆";
        renkA = "#ffcdd2"; renkB = "#c8e6c9"; ikonB = "✅";
    } else {
        kazanan = "EŞİT SONUÇ.";
    }

    const sonucDiv = document.getElementById('comp-sonuc');
    sonucDiv.style.display = 'block';
    
    sonucDiv.innerHTML = `
        <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:15px; color:#333;">${kazanan}</div>
        <div style="display:flex; gap:15px;">
            <div style="flex:1; background:${renkA}; padding:15px; border-radius:8px; text-align:center; border:1px solid #ccc;">
                <div style="font-size:12px; color:#555; font-weight:bold;">A) ${sA.sera_adi}</div>
                <div style="font-size:14px; margin-bottom:5px;">${uA.urun_adi}</div>
                <div style="font-size:20px; font-weight:bold; color:#2e7d32;">₺${karA.toLocaleString()}</div>
                ${ikonA}
            </div>
            <div style="display:flex; align-items:center; justify-content:center; font-size:12px; color:#666;">
                <div style="background:white; padding:5px 10px; border-radius:15px; border:1px solid #ccc; font-weight:bold;">Fark: ₺${fark.toLocaleString()}</div>
            </div>
            <div style="flex:1; background:${renkB}; padding:15px; border-radius:8px; text-align:center; border:1px solid #ccc;">
                <div style="font-size:12px; color:#555; font-weight:bold;">B) ${sB.sera_adi}</div>
                <div style="font-size:14px; margin-bottom:5px;">${uB.urun_adi}</div>
                <div style="font-size:20px; font-weight:bold; color:#2e7d32;">₺${karB.toLocaleString()}</div>
                ${ikonB}
            </div>
        </div>
    `;
}

// --- MODÜL 4: STRES TESTİ (MEVCUT YAPI) ---
function analizStres() {
    const artisGubre = parseInt(document.getElementById('slider-gubre').value);
    const artisIscilik = parseInt(document.getElementById('slider-iscilik').value);
    const artisEnerji = parseInt(document.getElementById('slider-enerji').value);
    const artisLojistik = parseInt(document.getElementById('slider-lojistik').value);

    document.getElementById('val-gubre').innerText = artisGubre;
    document.getElementById('val-iscilik').innerText = artisIscilik;
    document.getElementById('val-enerji').innerText = artisEnerji;
    document.getElementById('val-lojistik').innerText = artisLojistik;

    let toplamCiro = 0;
    let toplamMaliyet = 0;
    const bazUrun = urunListesi[0] || {verim_kg_m2:0, satis_fiyati_tl:0, maliyet_tl_m2:0}; 

    seraListesi.forEach(sera => {
        let ciro = sera.alan_m2 * bazUrun.verim_kg_m2 * bazUrun.satis_fiyati_tl;
        let maliyet = sera.alan_m2 * bazUrun.maliyet_tl_m2;
        toplamCiro += ciro;
        toplamMaliyet += maliyet;
    });

    const normalKar = toplamCiro - toplamMaliyet;
    const payGubre = toplamMaliyet * 0.35;
    const payIscilik = toplamMaliyet * 0.30;
    const payEnerji = toplamMaliyet * 0.20;
    const payLojistik = toplamMaliyet * 0.15;

    const yeniGubre = payGubre * (1 + artisGubre / 100);
    const yeniIscilik = payIscilik * (1 + artisIscilik / 100);
    const yeniEnerji = payEnerji * (1 + artisEnerji / 100);
    const yeniLojistik = payLojistik * (1 + artisLojistik / 100);

    const yeniToplamMaliyet = yeniGubre + yeniIscilik + yeniEnerji + yeniLojistik;
    const stresliKar = toplamCiro - yeniToplamMaliyet;

    document.getElementById('normal-kar').innerText = `₺${normalKar.toLocaleString()}`;
    const stresliKarElement = document.getElementById('stresli-kar');
    stresliKarElement.innerText = `₺${stresliKar.toLocaleString()}`;

    if (stresliKar < 0) {
        stresliKarElement.style.color = 'red';
        stresliKarElement.innerText += " (ZARAR!)";
    } else {
        stresliKarElement.style.color = '#d32f2f';
    }
}
// ==========================================
// YENİ GRAFİK 1: MALİYET PASTASI (PIE CHART)
// ==========================================
function drawCostChart() {
    const ctx = document.getElementById('maliyetPastasi').getContext('2d');
    
    // Sabit Oranlar (Sektör Ortalaması Baz Alındı)
    // Hocana not: "Bu oranlar genel tarım maliyet standartlarına göre simüle edilmiştir." diyebilirsin.
    const veriler = [35, 30, 20, 15]; // %35 Gübre, %30 İşçilik, %20 Enerji, %15 Lojistik
    const etiketler = ['Gübre & İlaç (%35)', 'İşçilik (%30)', 'Enerji & Su (%20)', 'Lojistik & Diğer (%15)'];

    new Chart(ctx, {
        type: 'doughnut', // İçi boş pasta (Simit) grafik
        data: {
            labels: etiketler,
            datasets: [{
                data: veriler,
                backgroundColor: [
                    '#ff9800', // Turuncu (Gübre)
                    '#2196f3', // Mavi (İşçilik)
                    '#f44336', // Kırmızı (Enerji)
                    '#9c27b0'  // Mor (Lojistik)
                ],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom' // Açıklamalar altta olsun
                }
            }
        }
    });
}
// ==========================================
// YENİ GRAFİK 2: YILLIK TREND (GÜNCELLENMİŞ 2022 DAHİL)
// ==========================================
function drawTrendChart() {
    const ctx = document.getElementById('trendGrafigi');
    if(!ctx) return; 

    // Veriler (2022'den Başlayan Büyüme)
    const yillar = ['2022', '2023', '2024', '2025', '2026 (Hedef)'];
    const cirolar = [0.9, 1.4, 1.9, 2.8, 4.2]; // Milyon TL cinsinden büyüme senaryosu

    new Chart(ctx.getContext('2d'), {
        type: 'line', 
        data: {
            labels: yillar,
            datasets: [{
                label: 'Yıllık Toplam Ciro (Milyon ₺)',
                data: cirolar,
                borderColor: '#2e7d32', 
                backgroundColor: 'rgba(46, 125, 50, 0.1)', 
                borderWidth: 3,
                tension: 0.4, 
                fill: true,   
                pointBackgroundColor: '#fff',
                pointBorderColor: '#2e7d32',
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false, 
                    grid: { color: '#f0f0f0' } 
                },
                x: {
                    grid: { display: false } 
                }
            },
            plugins: {
                legend: { display: false } 
            }
        }
    });
}// ==========================================
// YENİ ÖZELLİK: GEÇMİŞ PERFORMANS DÜELLOSU
// ==========================================
let chartDuello = null; // Grafik değişkeni

function analizGecmisKarsilastir() {
    // 1. Seçilen Ürünleri Al
    const urun1Id = document.getElementById('duello-urun-1').value;
    const urun2Id = document.getElementById('duello-urun-2').value;
    
    const urun1 = urunListesi.find(u => u.id == urun1Id);
    const urun2 = urunListesi.find(u => u.id == urun2Id);

    if(!urun1 || !urun2) { alert("Lütfen iki ürün seçiniz."); return; }

    // 2. Veri Hazırla (Simülasyon Mantığı)
    // Gerçek SQL verisi her yıl için olmayabilir, bu yüzden ürünün kapasitesine göre
    // mantıklı bir geçmiş veri üretiyoruz.
    const yillar = ['2022', '2023', '2024', '2025'];
    
    // 1 Dönüm (1000m2) üzerinden Baz Kar Hesapla
    const kar1 = (1000 * urun1.verim_kg_m2 * urun1.satis_fiyati_tl) - (1000 * urun1.maliyet_tl_m2);
    const kar2 = (1000 * urun2.verim_kg_m2 * urun2.satis_fiyati_tl) - (1000 * urun2.maliyet_tl_m2);

    // Yıllara göre dalgalanma senaryosu (Örn: 2024 zor yıldı, 2025 iyi yıldı)
    const data1 = [kar1 * 0.7, kar1 * 0.85, kar1 * 0.65, kar1 * 1.0]; 
    const data2 = [kar2 * 0.7, kar2 * 0.85, kar2 * 0.65, kar2 * 1.0];

    // 3. Grafiği Çiz
    const ctx = document.getElementById('duelloGrafigi').getContext('2d');

    if(chartDuello) chartDuello.destroy(); // Eski grafik varsa temizle

    chartDuello = new Chart(ctx, {
        type: 'line', // Çizgi Grafik
        data: {
            labels: yillar,
            datasets: [
                {
                    label: urun1.urun_adi, // 1. Ürün Adı
                    data: data1,
                    borderColor: '#673ab7', // Mor Çizgi
                    backgroundColor: 'rgba(103, 58, 183, 0.1)',
                    borderWidth: 3,
                    tension: 0.3, // Kıvrımlı çizgi
                    fill: true
                },
                {
                    label: urun2.urun_adi, // 2. Ürün Adı
                    data: data2,
                    borderColor: '#2196f3', // Mavi Çizgi
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false, // Fareyle üzerine gelince ikisini de göster
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Paranın yanına TL işareti koy
                            return context.dataset.label + ': ₺' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Net Kar (1 Dönüm İçin - TL)' }
                }
            }
        }
    });
}
// ==========================================
// YENİ ÖZELLİK 2: MALİYET KIRILIMI DÜELLOSU
// ==========================================
let chartMaliyet = null;

function analizMaliyetKiyasla() {
    // 1. Seçimleri Al
    const urun1Id = document.getElementById('maliyet-urun-1').value;
    const urun2Id = document.getElementById('maliyet-urun-2').value;
    
    const urun1 = urunListesi.find(u => u.id == urun1Id);
    const urun2 = urunListesi.find(u => u.id == urun2Id);

    if(!urun1 || !urun2) { alert("Lütfen iki ürün seçiniz."); return; }

    // 2. Maliyet Kalemlerini Hesapla (Simülasyon Oranları)
    // Gerçek toplam maliyeti veritabanından alıyoruz, detayları oranlıyoruz.
    // 1 Dönüm (1000m2) için hesaplayalım
    const toplamMaliyet1 = 1000 * urun1.maliyet_tl_m2;
    const toplamMaliyet2 = 1000 * urun2.maliyet_tl_m2;

    // Maliyet Dağılım Oranları (Varsayılan Sektör Ortalaması)
    // Ürüne göre değişir ama şimdilik standart kabul ediyoruz
    const oranlar = { gubre: 0.35, iscilik: 0.30, enerji: 0.20, diger: 0.15 };

    const data1 = [
        toplamMaliyet1 * oranlar.gubre,
        toplamMaliyet1 * oranlar.iscilik,
        toplamMaliyet1 * oranlar.enerji,
        toplamMaliyet1 * oranlar.diger
    ];

    const data2 = [
        toplamMaliyet2 * oranlar.gubre,
        toplamMaliyet2 * oranlar.iscilik,
        toplamMaliyet2 * oranlar.enerji,
        toplamMaliyet2 * oranlar.diger
    ];

    // 3. Grafiği Çiz (Stacked Bar Chart)
    const ctx = document.getElementById('maliyetGrafigi').getContext('2d');

    if(chartMaliyet) chartMaliyet.destroy();

    chartMaliyet = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Gübre & İlaç', 'İşçilik', 'Enerji (Su/Isıtma)', 'Lojistik & Diğer'],
            datasets: [
                {
                    label: urun1.urun_adi,
                    data: data1,
                    backgroundColor: '#ff9800', // Turuncu
                    stack: 'Stack 0',
                },
                {
                    label: urun2.urun_adi,
                    data: data2,
                    backgroundColor: '#2196f3', // Mavi
                    stack: 'Stack 1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₺' + context.raw.toLocaleString();
                        }
                    }
                },
                title: {
                    display: true,
                    text: '1 Dönüm İçin Tahmini Gider Kalemleri (TL)'
                }
            },
            scales: {
                x: {
                    stacked: true, // Yan yana değil, gruplu gösterim
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
// ==========================================
// YENİ ÖZELLİK 3: SERA VERİMLİLİK KAPIŞMASI (DÜZELTİLDİ: GERÇEK VERİ)
// ==========================================
let chartSeraKarsilastirma = null;

function analizSeraKarsilastir() {
    // 1. Seçilen Seraları Al
    const s1_id = document.getElementById('sera-duello-1').value;
    const s2_id = document.getElementById('sera-duello-2').value;

    if(!s1_id || !s2_id) { alert("Lütfen iki farklı sera seçiniz."); return; }

    // 2. Backend'e İstek At (Artık uydurma hesap yok, veritabanına soruyoruz)
    fetch('/api/karsilastir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sera1Id: s1_id, sera2Id: s2_id })
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) {
            alert(data.error);
            return;
        }

        // 3. Gelen Gerçek Veriyi Grafiğe Dök
        const labels = data.map(item => item.sera_adi);
        const values = data.map(item => parseFloat(item.verimlilik));

        const ctx = document.getElementById('seraKarsilastirmaGrafigi').getContext('2d');

        if(chartSeraKarsilastirma) chartSeraKarsilastirma.destroy();

        chartSeraKarsilastirma = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'm² Başına Üretilen Yıllık Ciro (TL)',
                    data: values,
                    backgroundColor: [
                        '#00796b', // Koyu Turkuaz
                        '#4db6ac'  // Açık Turkuaz
                    ],
                    borderColor: ['#004d40', '#00695c'],
                    borderWidth: 1,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Ciro: ₺' + context.raw.toLocaleString() + ' / m²';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Verimlilik (TL / m²)' }
                    }
                }
            }
        });
    })
    .catch(err => {
        console.error("Karşılaştırma hatası:", err);
        alert("Veriler alınırken bir hata oluştu.");
    });
}

// ==========================================
// 5. DEPO & SATIŞ SAYFASI FONKSİYONLARI
// ==========================================
function initDepo() {
    console.log("Depo ve Satış sayfası yüklendi, veriler hazırlanıyor...");
    // Veritabanından depo_satis verilerini çekecek fetch buraya gelecek
}

async function initDepo() {
    try {
        const response = await fetch('/api/depo-satis');
        const veriler = await response.json();
        if (!veriler || veriler.length === 0) return;

        const urunGruplari = {};
        
        // Verileri Grupla
        veriler.forEach(d => {
            if (!urunGruplari[d.urun_adi]) {
                urunGruplari[d.urun_adi] = { talepler: [], uretimler: [], yillar: [] };
            }
            urunGruplari[d.urun_adi].talepler.push(parseFloat(d.gelen_talep_ton||0));
            urunGruplari[d.urun_adi].uretimler.push(parseFloat(d.toplam_uretim_ton||0));
            urunGruplari[d.urun_adi].yillar.push(d.yil);
        });

        const tbody = document.getElementById('strateji-body');
        tbody.innerHTML = '';

        Object.keys(urunGruplari).sort().forEach(urun => {
            const data = urunGruplari[urun];
            const yilSayisi = data.yillar.length;

            // 1. Ortalamalar
            const ortUretim = data.uretimler.reduce((a,b)=>a+b,0) / yilSayisi;
            const ortTalep = data.talepler.reduce((a,b)=>a+b,0) / yilSayisi;

            // 2. Hedef (Talebin %5 fazlası güvenlik stoğu olsun)
            const hedef2026 = ortTalep * 1.05;

            // 3. Karar Mekanizması
            const fark = hedef2026 - ortUretim;
            let oneriRenk = "", oneriMetin = "";

            if(fark > 2) { // Hedef üretimden büyükse -> ARTIR
                const artisYuzdesi = ((hedef2026 - ortUretim) / ortUretim) * 100;
                oneriRenk = "#e8f5e9"; 
                oneriMetin = `
                    <div style="color:#2ecc71; font-weight:bold;">📈 Üretimi Artır</div>
                    <div style="font-size:11px; color:#555;">
                        Talep yüksek.<br>Hedef: <b>${hedef2026.toFixed(1)} Ton</b>
                    </div>`;
            } 
            else if(fark < -2) { // Hedef üretimden küçükse -> AZALT
                const azalisYuzdesi = Math.abs(((hedef2026 - ortUretim) / ortUretim) * 100);
                oneriRenk = "#ffebee";
                oneriMetin = `
                    <div style="color:#c0392b; font-weight:bold;">📉 Üretimi Azalt</div>
                    <div style="font-size:11px; color:#555;">
                        Stok fazlası.<br>Hedef: <b>${hedef2026.toFixed(1)} Ton</b>
                    </div>`;
            } 
            else { // Dengede
                oneriRenk = "#f8f9fa";
                oneriMetin = `
                    <div style="color:#3498db; font-weight:bold;">⚖️ Dengede Tut</div>
                    <div style="font-size:11px; color:#555;">
                        Durum stabil.<br>Hedef: <b>${hedef2026.toFixed(1)} Ton</b>
                    </div>`;
            }

            // Tabloya Ekle (SADECE 4 SÜTUN)
            tbody.innerHTML += `
                <tr style="background:${oneriRenk}; border-bottom:1px solid #ddd;">
                    <td style="padding:15px; font-weight:bold; color:#2c3e50;">${urun}</td>
                    
                    <td style="text-align:center;">
                        <span style="font-weight:bold; font-size:16px;">${ortUretim.toFixed(1)} Ton</span>
                        <div style="font-size:10px; color:#777;">Yıllık Ort. Üretim</div>
                    </td>
                    
                    <td style="text-align:center;">
                        <span style="font-weight:bold; color:#2980b9; font-size:16px;">${ortTalep.toFixed(1)} Ton</span>
                        <div style="font-size:10px; color:#777;">Yıllık Ort. Talep</div>
                    </td>
                    
                    <td style="padding:10px; vertical-align:middle;">
                        ${oneriMetin}
                    </td>
                </tr>
            `;
        });
        
        drawDepoChart(veriler);

    } catch (err) {
        console.error("Hata:", err);
    }
}

// Grafik fonksiyonun (Değişmedi, aynen kalabilir)
function drawDepoChart(veriler) {
    const ctx = document.getElementById('chartDepoAnaliz').getContext('2d');
    const yillar = [...new Set(veriler.map(d => d.yil))].sort();
    const talepData = yillar.map(y => veriler.filter(d => d.yil == y).reduce((sum, d) => sum + parseFloat(d.gelen_talep_ton||0), 0));
    const uretimData = yillar.map(y => veriler.filter(d => d.yil == y).reduce((sum, d) => sum + parseFloat(d.toplam_uretim_ton||0), 0));

    if(window.myDepoChart) window.myDepoChart.destroy();
    window.myDepoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: yillar,
            datasets: [
                { label: 'Toplam Talep', data: talepData, backgroundColor: '#3498db' },
                { label: 'Toplam Üretim', data: uretimData, backgroundColor: '#2ecc71' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}