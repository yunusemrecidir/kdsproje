const mysql = require('mysql2');

// Veritabanı bağlantı ayarları
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Wamp varsayılan kullanıcı
    password: '',      // Wamp varsayılan şifre boştur
    database: 'kds'    // Oluşturduğumuz veritabanı ismi
});

// Bağlantıyı test edelim
connection.connect((err) => {
    if (err) {
        console.error('Veritabanına bağlanırken hata oluştu: ' + err.stack);
        return;
    }
    console.log('Veritabanına başarıyla bağlanıldı! ID: ' + connection.threadId);
});

module.exports = connection;