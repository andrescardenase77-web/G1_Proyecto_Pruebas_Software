const { Router } = require('express');
const libroController = require('../controllers/libroController');

const router = Router();

router.post('/', libroController.crearLibro);
router.get('/', libroController.obtenerLibros);
router.get('/:id', libroController.obtenerLibroPorId);
router.put('/:id', libroController.actualizarLibro);
router.delete('/:id', libroController.eliminarLibro);

module.exports = router;
