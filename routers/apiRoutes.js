const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController'); 

router.get('/urunler', apiController.getUrunler);
router.get('/seralar', apiController.getSeralar);
router.get('/uretim-gecmisi', apiController.getUretimGecmisi);
router.get('/depo-satis', apiController.getDepoSatis);
router.get('/depo-arz-talep', apiController.getArzTalep);
router.get('/depo-yillar', apiController.getDepoYillar);
router.get('/en-cok-kazandiran', apiController.getEnCokKazandiranUrunler);
router.get('/finansal-trend', apiController.getFinansalTrend);
router.get('/sera-verimlilik', apiController.getSeraVerimlilik);
router.get('/karlilik-analizi', apiController.getKarlilikAnalizi);
router.get('/urun-detay/:id', apiController.getUrunDetay);
router.get('/genel-finans', apiController.getGenelFinansDurumu);
router.get('/finansal-ozet', apiController.getFinansalOzet);
router.post('/karsilastir', apiController.seraKarsilastir);

module.exports = router;