const express = require('express');

const autorRoutes = require('./routes/autorRoutes');
const lectorRoutes = require('./routes/lectorRoutes');
const libroRoutes = require('./routes/libroRoutes');
const prestamoRoutes = require('./routes/prestamo.routes');

const app = express();

app.use(express.json());
app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.json({ mensaje: 'API funcionando' });
});

app.use('/api/autores', autorRoutes);
app.use('/api/lectores', lectorRoutes);
app.use('/api/libros', libroRoutes);
app.use('/api/prestamos', prestamoRoutes);

module.exports = app;