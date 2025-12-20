const db = require('../model/database');

exports.login = (req, res) => {
    const { username, password } = req.body;
    
    db.query(
        'SELECT * FROM yoneticiler WHERE kullanici_adi = ? AND sifre = ?', 
        [username, password], 
        (err, results) => {
            if (err) {
                console.log(err);
                res.send('<script>alert("Veritabanı hatası!"); window.location.href="/";</script>');
            } else if (results && results.length > 0) {
                res.redirect('/panel');
            } else {
                res.send('<script>alert("Hatalı Kullanıcı Adı veya Şifre!"); window.location.href="/";</script>');
            }
        }
    );
};
