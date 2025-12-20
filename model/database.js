const mysql = require('mysql2');

// Veritabanı bağlantı ayarları
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kds'
});

// Bağlantıyı test et
connection.connect((err) => {
    if (err) {
        console.error('Veritabanına bağlanırken hata oluştu: ' + err.stack);
        return;
    }
    console.log('Veritabanına başarıyla bağlanıldı! ID: ' + connection.threadId);
});

module.exports = connection;
