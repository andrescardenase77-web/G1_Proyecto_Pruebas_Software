const mongoose = require('mongoose');
const Autor = require('../models/autor');

const idValido = (id) => mongoose.Types.ObjectId.isValid(id);
// se usa String.raw en lugar de '\\$&' para no escapar la barra invertida
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const nombreDuplicado = async (nombre, idExcluido) => {
  if (typeof nombre !== 'string') return false;
  const filtro = { nombre: new RegExp(`^${escaparRegex(nombre.trim())}$`, 'i') };
  if (idExcluido) filtro._id = { $ne: idExcluido };
  return Boolean(await Autor.exists(filtro));
};

const tieneLibros = async (autorId) => {
  const autorIdObj = new mongoose.Types.ObjectId(autorId);
  const total = await mongoose.connection
    .collection('libros')
    .countDocuments(
      {
        $or: [
          { autorId: autorIdObj },
          { autor_id: autorIdObj }
        ]
      },
      { limit: 1 }
    );
  return total > 0;
};

const manejarError = (res, error) => {
  if (error.code === 11000) {
    const campo = Object.keys(error.keyPattern || {})[0] || 'campo único';
    return res.status(409).json({
      success: false,
      mensaje: `Ya existe un registro con ese valor en '${campo}'`
    });
  }

  if (error.name === 'ValidationError') {
    const detalleError = Object.values(error.errors).map((err) => err.message).join(', ');
    return res.status(400).json({
      success: false,
      mensaje: detalleError || 'Error de validación en los datos'
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      mensaje: 'Formato de dato o ID inválido'
    });
  }

  return res.status(500).json({
    success: false,
    mensaje: 'Error interno del servidor',
    error: error.message
  });
};

const listarAutores = async (req, res) => {
  try {
    const autores = await Autor.find();
    return res.status(200).json({
      success: true,
      count: autores.length,
      data: autores
    });
  } catch (err) {
    return manejarError(res, err);
  }
};

const obtenerAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }
    const autor = await Autor.findById(req.params.id);
    if (!autor) {
      return res.status(404).json({
        success: false,
        mensaje: 'Autor no encontrado'
      });
    }
    return res.status(200).json({
      success: true,
      data: autor
    });
  } catch (err) {
    return manejarError(res, err);
  }
};

const crearAutor = async (req, res) => {
  try {
    const { nombre, nacionalidad } = req.body;
    const sitioWeb = req.body.sitioWeb ?? req.body.sitio_web;
    const anioNacimiento = req.body.anioNacimiento ?? req.body.anio_nacimiento;

    if (await nombreDuplicado(nombre)) {
      return res.status(409).json({
        success: false,
        mensaje: 'Ya existe un autor con ese nombre'
      });
    }

    const autor = await Autor.create({
      nombre,
      nacionalidad,
      sitioWeb,
      anioNacimiento
    });

    return res.status(201).json({
      success: true,
      mensaje: 'Autor registrado exitosamente',
      data: autor
    });
  } catch (err) {
    return manejarError(res, err);
  }
};

const actualizarAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const { nombre, nacionalidad } = req.body;
    const sitioWeb = req.body.sitioWeb ?? req.body.sitio_web;
    const anioNacimiento = req.body.anioNacimiento ?? req.body.anio_nacimiento;

    if (nombre && (await nombreDuplicado(nombre, req.params.id))) {
      return res.status(409).json({
        success: false,
        mensaje: 'Ya existe un autor con ese nombre'
      });
    }

    const camposActualizar = {};
    if (nombre !== undefined) camposActualizar.nombre = nombre;
    if (nacionalidad !== undefined) camposActualizar.nacionalidad = nacionalidad;
    if (sitioWeb !== undefined) {
      camposActualizar.sitioWeb = sitioWeb;
      camposActualizar.sitio_web = sitioWeb;
    }
    if (anioNacimiento !== undefined) {
      camposActualizar.anioNacimiento = anioNacimiento;
      camposActualizar.anio_nacimiento = anioNacimiento;
    }

    const autor = await Autor.findByIdAndUpdate(req.params.id, camposActualizar, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!autor) {
      return res.status(404).json({
        success: false,
        mensaje: 'Autor no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: 'Autor actualizado exitosamente',
      data: autor
    });
  } catch (err) {
    return manejarError(res, err);
  }
};

const eliminarAutor = async (req, res) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    if (await tieneLibros(req.params.id)) {
      return res.status(409).json({
        success: false,
        mensaje: 'No se puede eliminar un autor que tiene libros registrados'
      });
    }

    const autor = await Autor.findByIdAndDelete(req.params.id);
    if (!autor) {
      return res.status(404).json({
        success: false,
        mensaje: 'Autor no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: 'Autor eliminado exitosamente'
    });
  } catch (err) {
    return manejarError(res, err);
  }
};

module.exports = {
  listarAutores,
  obtenerAutor,
  crearAutor,
  actualizarAutor,
  eliminarAutor
};
