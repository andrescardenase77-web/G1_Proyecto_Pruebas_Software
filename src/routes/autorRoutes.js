const { Router } = require('express');
const {
  listarAutores,
  obtenerAutor,
  crearAutor,
  actualizarAutor,
  eliminarAutor,
} = require('../controllers/autorController');

const router = Router();

router.get('/', listarAutores);
router.get('/:id', obtenerAutor);
router.post('/', crearAutor);
router.put('/:id', actualizarAutor);
router.delete('/:id', eliminarAutor);

module.exports = router;
