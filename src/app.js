const express = require('express');

const app = express();

app.use(express.json());

app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.json({ mensaje: 'API funcionando' });
});


const lectorRoutes = require('./routes/lectorRoutes');
app.use('/api/lectores', lectorRoutes);

module.exports = app;
