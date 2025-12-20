
let urunListesi = [];
let seraListesi = [];
let uretimVerileri = [];
let chartKar = null;
let chartButce = null;
let chartDuello = null;
let chartMaliyet = null;
let chartSeraKarsilastirma = null;

const yorucuUrunler = ['Domates', 'Muz', 'Biber', 'Patlıcan', 'Karpuz'];

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initProduction();
    initAnaliz();
    initDepo();
});

function sayfaGoster(sayfaId) {
    document.querySelectorAll('.sayfa').forEach(div => div.style.display = 'none');
    document.getElementById('sayfa-' + sayfaId).style.display = 'block';
    
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById('link-' + sayfaId);
    if (activeLink) activeLink.classList.add('active');
}


let finansalOzetVerisi = null;

function initDashboard() {
    fetch('/api/urunler')
        .then(res => res.json())
        .then(data => {
            urunListesi = data;
            drawDashboardChart(data);
            analizDropdownDoldur();
        })
        .catch(err => console.error("Ürün verisi hatası:", err));

    fetch('/api/seralar')
        .then(res => res.json())
        .then(data => {
            seraListesi = data;
            analizDropdownDoldur();
        })
        .catch(err => console.error("Sera verisi hatası:", err));

    fetchFinansalOzet();

    drawCostChart();
    drawTrendChart();
    drawKazancChart();
    drawFinansalTrendChart();
    drawSeraVerimlilikChart();
    drawROIChart();
}
async function fetchFinansalOzet() {
    try {
        const response = await fetch('/api/finansal-ozet');
        const data = await response.json();
        finansalOzetVerisi = data;
        
        const giderElement = document.getElementById('toplam-gider');
        const gelirElement = document.getElementById('toplam-gelir');
        
        if (giderElement) {
            giderElement.textContent = `₺${parseFloat(data.toplam_gider).toLocaleString()}`;
        }
        if (gelirElement) {
            gelirElement.textContent = `₺${parseFloat(data.toplam_gelir).toLocaleString()}`;
        }
        
        const uretimGiderElement = document.getElementById('toplam-gider');
        const uretimGelirElement = document.getElementById('toplam-gelir');
        
        if (uretimGiderElement) {
            uretimGiderElement.textContent = `₺${parseFloat(data.toplam_gider).toLocaleString()}`;
        }
        if (uretimGelirElement) {
            uretimGelirElement.textContent = `₺${parseFloat(data.toplam_gelir).toLocaleString()}`;
        }
        
    } catch (err) {
        console.error("Finansal özet verisi hatası:", err);
    }
}

function drawDashboardChart(data) {
    const canvas = document.getElementById('karGrafigi');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labels = data.map(u => u.urun_adi);
    const values = data.map(u => (u.verim_kg_m2 * u.satis_fiyati_tl) - u.maliyet_tl_m2);

    if (chartKar) chartKar.destroy();
    
    chartKar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'm² Başına Net Kar (TL)',
                data: values,
                backgroundColor: '#2e7d32',
                borderRadius: 6
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true } } 
        }
    });
}

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
    if (activeBtn) activeBtn.classList.add('active');

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
                    <td><strong>${item.urun_adi || 'Belirsiz'}</strong></td>
                    <td>${item.yil}</td> 
                    <td style="color:#d32f2f">₺${g.toLocaleString()}</td>
                    <td style="color:#2e7d32">₺${k.toLocaleString()}</td>
                    <td><span class="status-badge success">${item.durum || 'Tamamlandı'}</span></td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    if (document.getElementById('toplam-gider')) {
        document.getElementById('toplam-gider').innerText = `₺${totalGider.toLocaleString()}`;
    }
    if (document.getElementById('toplam-gelir')) {
        document.getElementById('toplam-gelir').innerText = `₺${totalGelir.toLocaleString()}`;
    }

    drawProductionChart(data);
}

function drawProductionChart(data) {
    const canvas = document.getElementById('butceGrafigi');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!data || data.length === 0) {
        if (chartButce) chartButce.destroy();
        return;
    }

    const seralar = [...new Set(data.map(i => i.sera_adi || 'Bilinmiyor'))];
    const giderler = seralar.map(s => data.filter(i => (i.sera_adi || 'Bilinmiyor') === s).reduce((a, b) => a + (parseFloat(b.gider) || 0), 0));
    const gelirler = seralar.map(s => data.filter(i => (i.sera_adi || 'Bilinmiyor') === s).reduce((a, b) => a + (parseFloat(b.gelir) || 0), 0));

    if (chartButce) chartButce.destroy();
    chartButce = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: seralar,
            datasets: [
                { label: 'Gider', data: giderler, backgroundColor: '#ef5350', borderRadius: 6 },
                { label: 'Gelir', data: gelirler, backgroundColor: '#66bb6a', borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function initAnaliz() {
    if (urunListesi.length > 0 && seraListesi.length > 0) {
        analizDropdownDoldur();
    }

    if (!finansalOzetVerisi) {
        fetchFinansalOzet();
    }
    initRiskAnalizi();
    initEnflasyonAnalizi();
}

function analizDropdownDoldur() {
    if (seraListesi.length === 0 || urunListesi.length === 0) return;

    const seraHTML = seraListesi.map(s => `<option value="${s.id}">${s.sera_adi} (${s.alan_m2} m²)</option>`).join('');
    const urunHTML = urunListesi.filter(u => u.id != 99).map(u => `<option value="${u.id}">${u.urun_adi}</option>`).join('');

    if (document.getElementById('nadas-sera-secimi')) document.getElementById('nadas-sera-secimi').innerHTML = seraHTML;
    if (document.getElementById('nadas-urun-secimi')) document.getElementById('nadas-urun-secimi').innerHTML = urunHTML;
    
    const riskSelect = document.getElementById('risk-urun-secimi');
    if (riskSelect) {
        riskSelect.innerHTML = '<option value="">Ürün Seçiniz...</option>' + urunHTML;
    }
    
    if (document.getElementById('yatirim-urun')) document.getElementById('yatirim-urun').innerHTML = urunHTML;

    if (document.getElementById('comp-sera-a')) {
        document.getElementById('comp-sera-a').innerHTML = seraHTML;
        document.getElementById('comp-urun-a').innerHTML = urunHTML;
        document.getElementById('comp-sera-b').innerHTML = seraHTML;
        document.getElementById('comp-urun-b').innerHTML = urunHTML;

        if (document.getElementById('duello-urun-1')) {
            document.getElementById('duello-urun-1').innerHTML = urunHTML;
            document.getElementById('duello-urun-2').innerHTML = urunHTML;

            if (document.getElementById('maliyet-urun-1')) {
                document.getElementById('maliyet-urun-1').innerHTML = urunHTML;
                document.getElementById('maliyet-urun-2').innerHTML = urunHTML;

                if (document.getElementById('sera-duello-1')) {
                    const seraOpts = seraListesi.map(s => `<option value="${s.id}">${s.sera_adi}</option>`).join('');
                    document.getElementById('sera-duello-1').innerHTML = seraOpts;
                    document.getElementById('sera-duello-2').innerHTML = seraOpts;
                }
            }
        }    
    }
}

function analizNadas() {
    const sonucDiv = document.getElementById('nadas-sonuc');
    const seraId = document.getElementById('nadas-sera-secimi').value;
    const urunId = document.getElementById('nadas-urun-secimi').value;
    
    if (!seraId || !urunId) { alert("Lütfen seçim yapınız."); return; }

    const sera = seraListesi.find(s => s.id == seraId);
    const urun = urunListesi.find(u => u.id == urunId);

    const yillikStandartKar = (sera.alan_m2 * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (sera.alan_m2 * urun.maliyet_tl_m2);
    const isYorucu = yorucuUrunler.includes(urun.urun_adi);
    
    let yorgunlukFaktoru = 0; 
    let nadasArtisi = 0;      
    let aciklama = "";

    if (isYorucu) {
        yorgunlukFaktoru = 0.50; 
        nadasArtisi = 1.90;      
        aciklama = `<strong>${urun.urun_adi}</strong>, toprağı çok yoran "Ağır" kategorisinde bir üründür. Dinlendirmeden üst üste ekim yapmak verimi yarı yarıya düşürür.`;
    } else {
        yorgunlukFaktoru = 0.90; 
        nadasArtisi = 1.20;      
        aciklama = `<strong>${urun.urun_adi}</strong>, toprağı az yoran "Hafif" bir üründür. Bu ürün için 1 yıl boş beklemek ekonomik değildir.`;
    }

    const senaryo1Toplam = yillikStandartKar + (yillikStandartKar * yorgunlukFaktoru);
    const senaryo2Toplam = (-5000) + (yillikStandartKar * nadasArtisi);

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
                <div style="font-size:11px; color:#666; margin-top:5px;">2. Yıl Verim: <strong>%${Math.round(yorgunlukFaktoru * 100)}</strong></div>
                ${senaryo1Toplam > senaryo2Toplam ? '<div style="margin-top:8px; color:#2e7d32; font-weight:bold; font-size:12px;">✅ TAVSİYE EDİLEN</div>' : ''}
            </div>
            <div style="flex:1; padding:15px; border-radius:10px; text-align:center; transition: all 0.3s; ${stilB}">
                <div style="font-weight:bold; color:#555; font-size:12px; margin-bottom:5px;">B) NADAS PLANI</div>
                <div style="font-size:20px; font-weight:bold; color:#c62828;">₺${senaryo2Toplam.toLocaleString()}</div>
                <div style="font-size:11px; color:#666; margin-top:5px;">2. Yıl Verim: <strong>%${Math.round(nadasArtisi * 100)}</strong></div>
                ${senaryo2Toplam > senaryo1Toplam ? '<div style="margin-top:8px; color:#d32f2f; font-weight:bold; font-size:12px;">✅ TAVSİYE EDİLEN</div>' : ''}
            </div>
        </div>
        <div style="background:#fff3e0; padding:12px; border-radius:6px; border-left:4px solid #ff9800; font-size:13px; color:#5d4037;">
            <i class="fas fa-lightbulb" style="color:#f57c00; margin-right:5px;"></i> <strong>Neden?</strong> ${aciklama}
        </div>
    `;
}

function analizYatirim() {
    const tip = document.getElementById('yatirim-tipi').value;
    const urunId = document.getElementById('yatirim-urun').value;
    const urun = urunListesi.find(u => u.id == urunId);

    if (tip === "0") { alert("Lütfen sera tipi seçiniz!"); return; }

    let yatirimMaliyeti = 0; let alan = 0; let tipAdi = "";
    if (tip === "kucuk") { yatirimMaliyeti = 80000; alan = 200; tipAdi = "Küçük Boy Sera"; }
    else if (tip === "orta") { yatirimMaliyeti = 150000; alan = 500; tipAdi = "Orta Boy Sera"; }
    else if (tip === "buyuk") { yatirimMaliyeti = 400000; alan = 1000; tipAdi = "Büyük Boy Sera"; }

    const yillikNetKar = (alan * urun.verim_kg_m2 * urun.satis_fiyati_tl) - (alan * urun.maliyet_tl_m2);
    const yilOlarakDonus = (yatirimMaliyeti / yillikNetKar).toFixed(1);

    const sonucDiv = document.getElementById('yatirim-sonuc');
    sonucDiv.style.display = 'block';

    let renk = yilOlarakDonus < 2 ? "green" : (yilOlarakDonus < 4 ? "orange" : "red");
    let yorum = yilOlarakDonus < 2 ? "MÜKEMMEL YATIRIM! 🚀" : (yilOlarakDonus < 4 ? "Mantıklı." : "Riskli.");

    sonucDiv.innerHTML = `
        <strong>${tipAdi} + ${urun.urun_adi}</strong><br>
        Maliyet: ₺${yatirimMaliyeti.toLocaleString()} | Yıllık Kar: ₺${yillikNetKar.toLocaleString()}<br>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
        Geri Dönüş: <strong>${yilOlarakDonus} Yıl</strong> <strong style="color:${renk}">(${yorum})</strong>
    `;
}

function analizKarsilastir() {
    const sA = seraListesi.find(s => s.id == document.getElementById('comp-sera-a').value);
    const uA = urunListesi.find(u => u.id == document.getElementById('comp-urun-a').value);
    const sB = seraListesi.find(s => s.id == document.getElementById('comp-sera-b').value);
    const uB = urunListesi.find(u => u.id == document.getElementById('comp-urun-b').value);

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

function analizStres() {
    const artisGubre = parseInt(document.getElementById('slider-gubre').value);
    const artisIscilik = parseInt(document.getElementById('slider-iscilik').value);
    const artisEnerji = parseInt(document.getElementById('slider-enerji').value);
    const artisLojistik = parseInt(document.getElementById('slider-lojistik').value);

    document.getElementById('val-gubre').innerText = artisGubre;
    document.getElementById('val-iscilik').innerText = artisIscilik;
    document.getElementById('val-enerji').innerText = artisEnerji;
    document.getElementById('val-lojistik').innerText = artisLojistik;

    if (!finansalOzetVerisi) {
        console.warn("Finansal özet verisi henüz yüklenmedi");
        return;
    }
    
    const toplamCiro = parseFloat(finansalOzetVerisi.toplam_gelir) || 0;
    const toplamMaliyet = parseFloat(finansalOzetVerisi.toplam_gider) || 0;

    const normalKar = toplamCiro - toplamMaliyet;
    
    const payGubre = toplamMaliyet * 0.35;      
    const payIscilik = toplamMaliyet * 0.40;    
    const payEnerji = toplamMaliyet * 0.15;     
    const payLojistik = toplamMaliyet * 0.10;   

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

function drawCostChart() {
    const canvas = document.getElementById('maliyetPastasi');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const veriler = [35, 30, 20, 15];
    const etiketler = ['Gübre & İlaç (%35)', 'İşçilik (%30)', 'Enerji & Su (%20)', 'Lojistik & Diğer (%15)'];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: etiketler,
            datasets: [{
                data: veriler,
                backgroundColor: ['#ff9800', '#2196f3', '#f44336', '#9c27b0'],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function drawKazancChart() {
    const canvas = document.getElementById('kazancPastasi');
    if (!canvas) return;

    try {
        const response = await fetch('/api/en-cok-kazandiran');
        const veriler = await response.json();
        
        if (!veriler || veriler.length === 0) return;

        const ctx = canvas.getContext('2d');
        const etiketler = veriler.map(v => v.urun_adi);
        const degerler = veriler.map(v => parseFloat(v.toplam_kazanc) || 0);
        
        const renkler = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#E7E9ED', '#76D7C4', '#F39C12', '#8E44AD',
            '#3498DB', '#E74C3C', '#2ECC71', '#1ABC9C', '#34495E'
        ];

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: etiketler,
                datasets: [{
                    data: degerler,
                    backgroundColor: renkler.slice(0, etiketler.length),
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.toLocaleString();
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ₺${value} (%${percentage})`;
                            }
                        }
                    }
                }
            }
        });

        const listeDiv = document.getElementById('kazancListesi');
        if (listeDiv) {
            const toplamKazanc = degerler.reduce((a, b) => a + b, 0);
            let html = '';
            
            veriler.slice(0, 5).forEach((urun, index) => {
                const kazanc = parseFloat(urun.toplam_kazanc) || 0;
                const yuzde = ((kazanc / toplamKazanc) * 100).toFixed(1);
                const renk = renkler[index];
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                
                html += `
                    <div style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, ${renk}15, ${renk}05); border-radius: 10px; border-left: 4px solid ${renk};">
                        <span style="font-size: 20px; margin-right: 12px;">${medal}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">${urun.urun_adi}</div>
                            <div style="font-size: 12px; color: #666;">Toplam Gelirin %${yuzde}'i</div>
                        </div>
                        <div style="font-weight: bold; color: ${renk}; font-size: 16px;">₺${kazanc.toLocaleString()}</div>
                    </div>
                `;
            });
            
            listeDiv.innerHTML = html;
        }

    } catch (err) {
        console.error("Kazanç grafiği hatası:", err);
    }
}

async function drawFinansalTrendChart() {
    const canvas = document.getElementById('gelirGiderGrafigi');
    if (!canvas) return;

    try {
        const response = await fetch('/api/finansal-trend');
        const veriler = await response.json();
        
        if (!veriler || veriler.length === 0) return;

        const ctx = canvas.getContext('2d');
        const yillar = veriler.map(v => v.yil);
        const gelirler = veriler.map(v => parseFloat(v.toplam_gelir) || 0);
        const giderler = veriler.map(v => parseFloat(v.toplam_gider) || 0);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: yillar,
                datasets: [
                    {
                        label: 'Toplam Gelir',
                        data: gelirler,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.3)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2ecc71',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Toplam Gider',
                        data: giderler,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.3)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#e74c3c',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.toLocaleString();
                                return `${context.dataset.label}: ₺${value} TL`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '500' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        title: {
                            display: true,
                            text: 'Tutar (TL)',
                            font: { size: 12, weight: '500' }
                        },
                        ticks: {
                            callback: function(value) {
                                return '₺' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Finansal trend grafiği hatası:", err);
    }
}

async function drawSeraVerimlilikChart() {
    const canvas = document.getElementById('verimlilikGrafigi');
    if (!canvas) return;

    try {
        const response = await fetch('/api/sera-verimlilik');
        const veriler = await response.json();
        
        if (!veriler || veriler.length === 0) return;

        const ctx = canvas.getContext('2d');
        const seraAdlari = veriler.map(v => v.sera_adi);
        const skorlar = veriler.map(v => parseFloat(v.verimlilik_skoru) || 0);
        
        const renkler = veriler.map((v, index) => {
            if (index === 0) return '#FFD700'; 
            if (index === 1) return '#C0C0C0'; 
            if (index === 2) return '#CD7F32';
            return '#4caf50';
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: seraAdlari,
                datasets: [{
                    label: 'Verimlilik (TL/m²)',
                    data: skorlar,
                    backgroundColor: renkler,
                    borderColor: renkler.map(r => r),
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 35
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: 14,
                        titleFont: { size: 15, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            title: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                const sera = veriler[index];
                                const sira = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                                return `${sira} ${sera.sera_adi}`;
                            },
                            label: function(context) {
                                const index = context.dataIndex;
                                const sera = veriler[index];
                                return [
                                    `Toplam Kazanç: ₺${parseFloat(sera.toplam_kazanc).toLocaleString()}`,
                                    `Alan: ${sera.alan_m2} m²`,
                                    `Verimlilik: ₺${sera.verimlilik_skoru} /m²`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        title: {
                            display: true,
                            text: 'Verimlilik Skoru (TL/m²)',
                            font: { size: 12, weight: '500' }
                        },
                        ticks: {
                            callback: function(value) {
                                return '₺' + value.toLocaleString();
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 12, weight: '500' },
                            callback: function(value, index) {
                                const medal = index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '';
                                return medal + this.getLabelForValue(value);
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Sera verimlilik grafiği hatası:", err);
    }
}

async function drawROIChart() {
    const canvas = document.getElementById('roiGrafigi');
    if (!canvas) return;

    try {
        const response = await fetch('/api/karlilik-analizi');
        const veriler = await response.json();
        
        if (!veriler || veriler.length === 0) return;

        const ctx = canvas.getContext('2d');
        
        const etiketler = veriler.map(v => `${v.urun_adi} - ${v.sera_adi} (${v.yil})`);
        const karMarjlari = veriler.map(v => parseFloat(v.kar_marji) || 0);
        
        const renkler = karMarjlari.map(marj => {
            if (marj > 100) return '#2e7d32';      
            if (marj >= 50) return '#66bb6a';     
            if (marj >= 0) return '#ffa726';       
            return '#ef5350';                      
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiketler,
                datasets: [{
                    label: 'Kar Marjı (%)',
                    data: karMarjlari,
                    backgroundColor: renkler,
                    borderColor: renkler,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: 14,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const index = context.dataIndex;
                                const veri = veriler[index];
                                const marj = context.raw;
                                let durum = '';
                                if (marj > 100) durum = '🟢 Yüksek Verim';
                                else if (marj >= 50) durum = '🟡 İyi Verim';
                                else if (marj >= 0) durum = '🟠 Düşük Verim';
                                else durum = '🔴 Zarar/Risk';
                                
                                return [
                                    `Kar Marjı: %${marj.toFixed(1)}`,
                                    `Maliyet: ₺${parseFloat(veri.maliyet_tl).toLocaleString()}`,
                                    `Kazanç: ₺${parseFloat(veri.kazanc_tl).toLocaleString()}`,
                                    `Durum: ${durum}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        title: {
                            display: true,
                            text: 'Kar Marjı (%)',
                            font: { size: 12, weight: '500' }
                        },
                        ticks: {
                            callback: function(value) {
                                return '%' + value;
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("ROI grafiği hatası:", err);
    }
}

let riskUrunVerisi = null;

function initRiskAnalizi() {
    const riskSelect = document.getElementById('risk-urun-secimi');
    const fiyatSlider = document.getElementById('fiyat-slider');
    
    if (riskSelect) {
        riskSelect.addEventListener('change', async function() {
            const urunId = this.value;
            const bilgiAlani = document.getElementById('risk-bilgi-alani');
            
            if (!urunId) {
                bilgiAlani.style.display = 'none';
                riskUrunVerisi = null;
                return;
            }
            
            try {
                const response = await fetch(`/api/urun-detay/${urunId}`);
                const data = await response.json();
                riskUrunVerisi = data;
                
                document.getElementById('risk-fiyat').textContent = `₺${parseFloat(data.satis_fiyati_tl).toFixed(2)}`;
                
                const mevcutFiyat = parseFloat(data.satis_fiyati_tl);
                const maliyet = parseFloat(data.maliyet_tl_m2);
                const verim = parseFloat(data.verim_kg_m2);
                const breakEvenFiyat = maliyet / verim;
                
                const minFiyat = breakEvenFiyat * 0.5;
                const maxFiyat = mevcutFiyat * 1.5;
                
                fiyatSlider.min = minFiyat.toFixed(2);
                fiyatSlider.max = maxFiyat.toFixed(2);
                fiyatSlider.value = mevcutFiyat;
                fiyatSlider.step = 0.1;
                
                document.getElementById('slider-min').textContent = `₺${minFiyat.toFixed(2)}`;
                document.getElementById('slider-max').textContent = `₺${maxFiyat.toFixed(2)}`;
                
                document.getElementById('risk-breakeven').textContent = `₺${breakEvenFiyat.toFixed(2)} /kg`;
                
                bilgiAlani.style.display = 'block';
                hesaplaRiskSimulasyonu(mevcutFiyat);
                
            } catch (err) {
                console.error("Ürün detay hatası:", err);
            }
        });
    }
    
    if (fiyatSlider) {
        fiyatSlider.addEventListener('input', function() {
            if (riskUrunVerisi) {
                hesaplaRiskSimulasyonu(parseFloat(this.value));
            }
        });
    }
}

function hesaplaRiskSimulasyonu(senaryoFiyati) {
    if (!riskUrunVerisi) return;
    
    const maliyet = parseFloat(riskUrunVerisi.maliyet_tl_m2);
    const verim = parseFloat(riskUrunVerisi.verim_kg_m2);
    const mevcutFiyat = parseFloat(riskUrunVerisi.satis_fiyati_tl);
    
    const breakEvenFiyat = maliyet / verim;
    
    const guvenliSinir = breakEvenFiyat * 1.2;
    
    document.getElementById('senaryo-fiyat-gosterge').textContent = `₺${senaryoFiyati.toFixed(2)}`;
    
    const durumKutusu = document.getElementById('risk-durum-kutusu');
    const durumBadge = document.getElementById('risk-durum-badge');
    const durumIcon = document.getElementById('risk-durum-icon');
    
    if (senaryoFiyati >= guvenliSinir) {  
        durumKutusu.style.background = 'linear-gradient(135deg, #e8f5e9, #c8e6c9)';
        durumKutusu.style.borderColor = '#4caf50';
        durumBadge.textContent = 'KÂRLI';
        durumBadge.style.color = '#2e7d32';
        durumIcon.textContent = '✅';
    } else if (senaryoFiyati >= breakEvenFiyat) {
        durumKutusu.style.background = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
        durumKutusu.style.borderColor = '#ffc107';
        durumBadge.textContent = 'RİSKLİ';
        durumBadge.style.color = '#f57c00';
        durumIcon.textContent = '⚠️';
    } else {
        durumKutusu.style.background = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
        durumKutusu.style.borderColor = '#f44336';
        durumBadge.textContent = 'ZARAR';
        durumBadge.style.color = '#c62828';
        durumIcon.textContent = '❌';
    }
}

let enflasyonFinansVerisi = null;

async function initEnflasyonAnalizi() {
    const enflasyonSlider = document.getElementById('enflasyon-slider');
    if (!enflasyonSlider) return;
    
    try {
        const response = await fetch('/api/finansal-ozet');
        const data = await response.json();
        enflasyonFinansVerisi = {
            toplam_maliyet: data.toplam_gider,
            toplam_gelir: data.toplam_gelir
        };
        
        const toplamMaliyet = parseFloat(data.toplam_gider) || 0;
        const toplamGelir = parseFloat(data.toplam_gelir) || 0;
        const mevcutKar = parseFloat(data.net_kar) || 0;
        
        document.getElementById('enflasyon-mevcut-kar').textContent = `₺${mevcutKar.toLocaleString()}`;
        document.getElementById('enflasyon-senaryo-kar').textContent = `₺${mevcutKar.toLocaleString()}`;
        
        enflasyonSlider.addEventListener('input', function() {
            hesaplaEnflasyonSimulasyonu(parseInt(this.value));
        });
        
    } catch (err) {
        console.error("Finansal özet verisi hatası:", err);
    }
}

function hesaplaEnflasyonSimulasyonu(enflasyonOrani) {
    if (!enflasyonFinansVerisi) return;
    
    const toplamMaliyet = parseFloat(enflasyonFinansVerisi.toplam_maliyet) || 0;
    const toplamGelir = parseFloat(enflasyonFinansVerisi.toplam_gelir) || 0;
    const mevcutKar = toplamGelir - toplamMaliyet;
    
    const enflasyonCarpani = 1 + (enflasyonOrani / 100);
    
    const yeniMaliyet = toplamMaliyet * enflasyonCarpani;
    
    const senaryoKar = toplamGelir - yeniMaliyet;
    
    document.getElementById('enflasyon-oran').textContent = `%${enflasyonOrani}`;
    document.getElementById('enflasyon-senaryo-kar').textContent = `₺${senaryoKar.toLocaleString()}`;
    
    const senaryoKarElement = document.getElementById('enflasyon-senaryo-kar');
    const senaryoKutu = document.getElementById('enflasyon-senaryo-kutu');
    const uyariElement = document.getElementById('enflasyon-uyari');
    
    if (enflasyonOrani < 0) {
        senaryoKarElement.style.color = '#2e7d32';
        senaryoKutu.style.background = '#e8f5e9';
        senaryoKutu.style.borderColor = '#4caf50';
        uyariElement.style.background = '#e8f5e9';
        uyariElement.style.color = '#2e7d32';
        uyariElement.innerHTML = `<i class="fas fa-smile"></i> Deflasyon Senaryosu: Maliyetler düşerse kârınız ₺${(senaryoKar - mevcutKar).toLocaleString()} artar!`;
    } else if (senaryoKar < 0) {
        senaryoKarElement.style.color = '#c62828';
        senaryoKutu.style.background = '#ffebee';
        senaryoKutu.style.borderColor = '#f44336';
        uyariElement.style.background = '#ffebee';
        uyariElement.style.color = '#c62828';
        uyariElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> KRİTİK! Mevcut gelir yapısı bu enflasyonu kaldıramaz! Zarar: ₺${Math.abs(senaryoKar).toLocaleString()}`;
    } else if (senaryoKar < mevcutKar) {
        const karErimesi = mevcutKar - senaryoKar;
        const erimeyuzdesi = ((karErimesi / mevcutKar) * 100).toFixed(1);
        senaryoKarElement.style.color = '#e65100';
        senaryoKutu.style.background = '#fff3e0';
        senaryoKutu.style.borderColor = '#ff9800';
        uyariElement.style.background = '#fff3e0';
        uyariElement.style.color = '#e65100';
        uyariElement.innerHTML = `<i class="fas fa-arrow-down"></i> Dikkat! Kârınız %${erimeyuzdesi} eriyerek ₺${karErimesi.toLocaleString()} azalıyor.`;
    } else {
        senaryoKarElement.style.color = '#2e7d32';
        senaryoKutu.style.background = '#e8f5e9';
        senaryoKutu.style.borderColor = '#4caf50';
        uyariElement.style.background = '#e8f5e9';
        uyariElement.style.color = '#2e7d32';
        uyariElement.innerHTML = `<i class="fas fa-info-circle"></i> Slider'ı hareket ettirerek enflasyon senaryolarını test edin.`;
    }
}

function drawTrendChart() {
    const ctx = document.getElementById('trendGrafigi');
    if (!ctx) return; 

    const yillar = ['2022', '2023', '2024', '2025', '2026 (Hedef)'];
    const cirolar = [0.9, 1.4, 1.9, 2.8, 4.2];

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
                y: { beginAtZero: false, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function analizGecmisKarsilastir() {
    const urun1Id = document.getElementById('duello-urun-1').value;
    const urun2Id = document.getElementById('duello-urun-2').value;
    
    const urun1 = urunListesi.find(u => u.id == urun1Id);
    const urun2 = urunListesi.find(u => u.id == urun2Id);

    if (!urun1 || !urun2) { alert("Lütfen iki ürün seçiniz."); return; }

    const yillar = ['2022', '2023', '2024', '2025'];
    
    const kar1 = (1000 * urun1.verim_kg_m2 * urun1.satis_fiyati_tl) - (1000 * urun1.maliyet_tl_m2);
    const kar2 = (1000 * urun2.verim_kg_m2 * urun2.satis_fiyati_tl) - (1000 * urun2.maliyet_tl_m2);

    const data1 = [kar1 * 0.7, kar1 * 0.85, kar1 * 0.65, kar1 * 1.0]; 
    const data2 = [kar2 * 0.7, kar2 * 0.85, kar2 * 0.65, kar2 * 1.0];

    const ctx = document.getElementById('duelloGrafigi').getContext('2d');

    if (chartDuello) chartDuello.destroy();

    chartDuello = new Chart(ctx, {
        type: 'line',
        data: {
            labels: yillar,
            datasets: [
                {
                    label: urun1.urun_adi,
                    data: data1,
                    borderColor: '#673ab7',
                    backgroundColor: 'rgba(103, 58, 183, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: urun2.urun_adi,
                    data: data2,
                    borderColor: '#2196f3',
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
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₺' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Net Kar (1 Dönüm İçin - TL)' } }
            }
        }
    });
}

function analizMaliyetKiyasla() {
    const urun1Id = document.getElementById('maliyet-urun-1').value;
    const urun2Id = document.getElementById('maliyet-urun-2').value;
    
    const urun1 = urunListesi.find(u => u.id == urun1Id);
    const urun2 = urunListesi.find(u => u.id == urun2Id);

    if (!urun1 || !urun2) { alert("Lütfen iki ürün seçiniz."); return; }

    const toplamMaliyet1 = 1000 * urun1.maliyet_tl_m2;
    const toplamMaliyet2 = 1000 * urun2.maliyet_tl_m2;

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

    const ctx = document.getElementById('maliyetGrafigi').getContext('2d');

    if (chartMaliyet) chartMaliyet.destroy();

    chartMaliyet = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Gübre & İlaç', 'İşçilik', 'Enerji (Su/Isıtma)', 'Lojistik & Diğer'],
            datasets: [
                { label: urun1.urun_adi, data: data1, backgroundColor: '#ff9800', stack: 'Stack 0' },
                { label: urun2.urun_adi, data: data2, backgroundColor: '#2196f3', stack: 'Stack 1' }
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
                title: { display: true, text: '1 Dönüm İçin Tahmini Gider Kalemleri (TL)' }
            },
            scales: {
                x: { stacked: true },
                y: { beginAtZero: true }
            }
        }
    });
}

function analizSeraKarsilastir() {
    const s1_id = document.getElementById('sera-duello-1').value;
    const s2_id = document.getElementById('sera-duello-2').value;

    if (!s1_id || !s2_id) { alert("Lütfen iki farklı sera seçiniz."); return; }

    fetch('/api/karsilastir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sera1Id: s1_id, sera2Id: s2_id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }

        const labels = data.map(item => item.sera_adi);
        const values = data.map(item => parseFloat(item.verimlilik));

        const ctx = document.getElementById('seraKarsilastirmaGrafigi').getContext('2d');

        if (chartSeraKarsilastirma) chartSeraKarsilastirma.destroy();

        chartSeraKarsilastirma = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'm² Başına Üretilen Yıllık Ciro (TL)',
                    data: values,
                    backgroundColor: ['#00796b', '#4db6ac'],
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
                    y: { beginAtZero: true, title: { display: true, text: 'Verimlilik (TL / m²)' } }
                }
            }
        });
    })
    .catch(err => {
        console.error("Karşılaştırma hatası:", err);
        alert("Veriler alınırken bir hata oluştu.");
    });
}

async function initDepo() {
    try {
        await initArzTalepYillar();
        drawArzTalepChart();
        
        const response = await fetch('/api/depo-satis');
        const veriler = await response.json();
        if (!veriler || veriler.length === 0) return;

        const urunGruplari = {};
        
        veriler.forEach(d => {
            if (!urunGruplari[d.urun_adi]) {
                urunGruplari[d.urun_adi] = { talepler: [], uretimler: [], yillar: [] };
            }
            urunGruplari[d.urun_adi].talepler.push(parseFloat(d.gelen_talep_ton || 0));
            urunGruplari[d.urun_adi].uretimler.push(parseFloat(d.toplam_uretim_ton || 0));
            urunGruplari[d.urun_adi].yillar.push(d.yil);
        });

        const tbody = document.getElementById('strateji-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        Object.keys(urunGruplari).sort().forEach(urun => {
            const data = urunGruplari[urun];
            const yilSayisi = data.yillar.length;

            const ortUretim = data.uretimler.reduce((a, b) => a + b, 0) / yilSayisi;
            const ortTalep = data.talepler.reduce((a, b) => a + b, 0) / yilSayisi;
            const hedef2026 = ortTalep * 1.05;
            const fark = hedef2026 - ortUretim;
            
            let oneriRenk = "", oneriMetin = "";

            if (fark > 2) {
                oneriRenk = "#e8f5e9"; 
                oneriMetin = `
                    <div style="color:#2ecc71; font-weight:bold;">📈 Üretimi Artır</div>
                    <div style="font-size:11px; color:#555;">
                        Talep yüksek.<br>Hedef: <strong>${hedef2026.toFixed(1)} Ton</strong>
                    </div>`;
            } 
            else if (fark < -2) {
                oneriRenk = "#ffebee";
                oneriMetin = `
                    <div style="color:#c0392b; font-weight:bold;">📉 Üretimi Azalt</div>
                    <div style="font-size:11px; color:#555;">
                        Stok fazlası.<br>Hedef: <strong>${hedef2026.toFixed(1)} Ton</strong>
                    </div>`;
            } 
            else {
                oneriRenk = "#f8f9fa";
                oneriMetin = `
                    <div style="color:#3498db; font-weight:bold;">⚖️ Dengede Tut</div>
                    <div style="font-size:11px; color:#555;">
                        Durum stabil.<br>Hedef: <strong>${hedef2026.toFixed(1)} Ton</strong>
                    </div>`;
            }

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

function drawDepoChart(veriler) {
    const canvas = document.getElementById('chartDepoAnaliz');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const yillar = [...new Set(veriler.map(d => d.yil))].sort();
    const talepData = yillar.map(y => veriler.filter(d => d.yil == y).reduce((sum, d) => sum + parseFloat(d.gelen_talep_ton || 0), 0));
    const uretimData = yillar.map(y => veriler.filter(d => d.yil == y).reduce((sum, d) => sum + parseFloat(d.toplam_uretim_ton || 0), 0));

    if (window.myDepoChart) window.myDepoChart.destroy();
    window.myDepoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: yillar,
            datasets: [
                { label: 'Toplam Talep', data: talepData, backgroundColor: '#3498db', borderRadius: 6 },
                { label: 'Toplam Üretim', data: uretimData, backgroundColor: '#2ecc71', borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

let chartArzTalep = null;

async function initArzTalepYillar() {
    const select = document.getElementById('yilFiltresiDepo');
    if (!select) return;

    try {
        const response = await fetch('/api/depo-yillar');
        const yillar = await response.json();
        
        select.innerHTML = '<option value="tumu">Tüm Yıllar (Genel Toplam)</option>';
        
        yillar.forEach(item => {
            const option = document.createElement('option');
            option.value = item.yil;
            option.textContent = item.yil;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Yıl listesi hatası:", err);
    }
}

function yilDegistiArzTalep() {
    const select = document.getElementById('yilFiltresiDepo');
    const secilenYil = select ? select.value : 'tumu';
    drawArzTalepChart(secilenYil);
}

async function drawArzTalepChart(yil = 'tumu') {
    const canvas = document.getElementById('arzTalepChart');
    if (!canvas) return;

    try {
        const url = yil && yil !== 'tumu' 
            ? `/api/depo-arz-talep?yil=${yil}` 
            : '/api/depo-arz-talep?yil=tumu';
        
        const response = await fetch(url);
        const veriler = await response.json();
        
        if (!veriler || veriler.length === 0) {
            if (chartArzTalep) chartArzTalep.destroy();
            return;
        }

        const labels = veriler.map(v => v.urun_adi);
        const uretimData = veriler.map(v => parseFloat(v.toplam_uretim) || 0);
        const talepData = veriler.map(v => parseFloat(v.toplam_talep) || 0);

        const ctx = canvas.getContext('2d');

        if (chartArzTalep) chartArzTalep.destroy();

        const baslik = yil && yil !== 'tumu' 
            ? `${yil} Yılı Arz-Talep Karşılaştırması` 
            : 'Tüm Yıllar Genel Toplam';

        chartArzTalep = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Üretim Miktarı (Ton)',
                        data: uretimData,
                        backgroundColor: 'rgba(46, 125, 50, 0.8)',
                        borderColor: '#2e7d32',
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'Gelen Talep (Ton)',
                        data: talepData,
                        backgroundColor: 'rgba(255, 152, 0, 0.8)',
                        borderColor: '#f57c00',
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: baslik,
                        font: { size: 14, weight: '600' },
                        color: '#333',
                        padding: { bottom: 15 }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.toLocaleString();
                                return `${context.dataset.label}: ${value} Ton`;
                            },
                            afterBody: function(tooltipItems) {
                                const uretim = tooltipItems[0]?.raw || 0;
                                const talep = tooltipItems[1]?.raw || 0;
                                const fark = uretim - talep;
                                const durum = fark >= 0 ? '✅ Arz Fazlası' : '⚠️ Talep Fazlası';
                                return `\n${durum}: ${Math.abs(fark).toLocaleString()} Ton`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        title: {
                            display: true,
                            text: 'Miktar (Ton)',
                            font: { size: 12, weight: '500' }
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Arz-Talep grafiği hatası:", err);
    }
}
