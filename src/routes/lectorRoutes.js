const { Router } = require('express');
const lectorController = require('../controllers/lectorController');

const router = Router();

router.post('/', lectorController.crearLector);
router.get('/', lectorController.obtenerLectores);
router.get('/:id', lectorController.obtenerLectorPorId);
router.put('/:id', lectorController.actualizarLector);
router.patch('/:id/sancion', lectorController.cambiarEstadoSancion);
router.delete('/:id', lectorController.eliminarLector);

module.exports = router;