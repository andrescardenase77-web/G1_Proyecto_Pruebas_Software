const express = require('express');
const prestamoRoutes = require('./routes/prestamo.routes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'API funcionando' });
});

app.use('/api/prestamos', prestamoRoutes);

module.exports = app;