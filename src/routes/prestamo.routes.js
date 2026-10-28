const express = require('express');
const router = express.Router();
const prestamoController = require('../controllers/prestamo.controller');

// 1. Reportes y consultas operativas
// Nota: Deben ir antes de '/:id' para que Express no confunda las palabras con un ID
router.get('/retrasados', prestamoController.obtenerPrestamosRetrasados);
router.get('/lector/:lectorId', prestamoController.obtenerHistorialPorLector);

// 2. Operaciones CRUD estándar
router.get('/', prestamoController.obtenerPrestamos);
router.get('/:id', prestamoController.obtenerPrestamoPorId);
router.post('/', prestamoController.crearPrestamo);
router.put('/:id', prestamoController.actualizarPrestamo);
router.delete('/:id', prestamoController.eliminarPrestamo);

// 3. Proceso formal de devolución de libro
router.post('/:id/devolucion', prestamoController.devolverLibro);

module.exports = router;