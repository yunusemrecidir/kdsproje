const express = require('express');
const path = require('path');
const app = express();

const routes = require('./routes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));  
app.use(express.static(path.join(__dirname, 'views')));   
app.use(express.static(__dirname));                        

app.use('/', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;
