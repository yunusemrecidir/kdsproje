const express = require('express');
const router = express.Router();
// Az önce oluşturduğumuz controller dosyasını buraya bağlıyoruz
const apiController = require('../controller/apiController'); 

// Rotaları tanımlıyoruz
router.get('/urunler', apiController.getUrunler);
router.get('/seralar', apiController.getSeralar);
router.get('/uretim-gecmisi', apiController.getUretimGecmisi);

module.exports = router;