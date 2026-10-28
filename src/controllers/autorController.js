const mongoose = require('mongoose');
const Autor = require('../models/autor');

const idValido = (id) => mongoose.Types.ObjectId.isValid(id);

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// RN-A2: no puede haber dos autores con el mismo nombre (sin importar mayúsculas)
const nombreDuplicado = async (nombre, idExcluido) => {
  if (typeof nombre !== 'string') return false;
  const filtro = { nombre: new RegExp(`^${escaparRegex(nombre.trim())}$`, 'i') };
  if (idExcluido) filtro._id = { $ne: idExcluido };
  return Boolean(await Autor.exists(filtro));
};

// RN-A4: se consulta la colección de libros directamente para no depender del modelo Libro
const tieneLibros = async (autorId) => {
  const total = await mongoose.connection
    .collection('libros')
    .countDocuments({ autor_id: new mongoose.Types.ObjectId(autorId) }, { limit: 1 });
  return total > 0;
};

const manejarError = (res, err) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ mensaje: err.message });
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor' });
};

const listarAutores = async (req, res) => {
  try {
    const autores = await Autor.find();
    res.json(autores);
  } catch (err) {
    manejarError(res, err);
  }
};

const obtenerAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }
    const autor = await Autor.findById(req.params.id);
    if (!autor) {
      return res.status(404).json({ mensaje: 'Autor no encontrado' });
    }
    res.json(autor);
  } catch (err) {
    manejarError(res, err);
  }
};

const crearAutor = async (req, res) => {
  try {
    if (await nombreDuplicado(req.body.nombre)) {
      return res.status(409).json({ mensaje: 'Ya existe un autor con ese nombre' });
    }
    const autor = await Autor.create(req.body);
    res.status(201).json(autor);
  } catch (err) {
    manejarError(res, err);
  }
};

const actualizarAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }
    if (await nombreDuplicado(req.body.nombre, req.params.id)) {
      return res.status(409).json({ mensaje: 'Ya existe un autor con ese nombre' });
    }
    const autor = await Autor.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!autor) {
      return res.status(404).json({ mensaje: 'Autor no encontrado' });
    }
    res.json(autor);
  } catch (err) {
    manejarError(res, err);
  }
};

const eliminarAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }
    if (await tieneLibros(req.params.id)) {
      return res.status(409).json({ mensaje: 'No se puede eliminar un autor que tiene libros registrados' });
    }
    const autor = await Autor.findByIdAndDelete(req.params.id);
    if (!autor) {
      return res.status(404).json({ mensaje: 'Autor no encontrado' });
    }
    res.json({ mensaje: 'Autor eliminado' });
  } catch (err) {
    manejarError(res, err);
  }
};

module.exports = {
  listarAutores,
  obtenerAutor,
  crearAutor,
  actualizarAutor,
  eliminarAutor,
};
