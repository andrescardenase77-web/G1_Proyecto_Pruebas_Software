const mongoose = require('mongoose');
const Lector = require('../models/lector');

const esIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

const manejarError = (res, error) => {
  if (error.code === 11000) {
    const campo = Object.keys(error.keyPattern || {})[0] || 'campo único';
    return res.status(409).json({
      success: false,
      message: `Ya existe un lector con ese valor en '${campo}'`
    });
  }

  if (error.name === 'ValidationError') {
    const detalles = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación en los datos',
      errors: detalles
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: error.message
  });
};

// POST /api/lectores
const crearLector = async (req, res) => {
  try {
    const { matricula, nombre, grado_curso, correo_institucional, sancionado } = req.body;
    const nuevoLector = await Lector.create({
      matricula,
      nombre,
      grado_curso,
      correo_institucional,
      sancionado
    });

    return res.status(201).json({
      success: true,
      message: 'Lector registrado exitosamente',
      data: nuevoLector
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// GET /api/lectores
const obtenerLectores = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.sancionado !== undefined) {
      filtro.sancionado = req.query.sancionado === 'true';
    }
    if (req.query.grado_curso) {
      filtro.grado_curso = req.query.grado_curso.trim();
    }

    const lectores = await Lector.find(filtro);
    return res.status(200).json({
      success: true,
      count: lectores.length,
      data: lectores
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// GET /api/lectores/:id
const obtenerLectorPorId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID con formato de MongoDB inválido'
      });
    }

    const lector = await Lector.findById(id);
    if (!lector) {
      return res.status(404).json({
        success: false,
        message: 'Lector no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: lector
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// PUT /api/lectores/:id
const actualizarLector = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID con formato de MongoDB inválido'
      });
    }

    const { matricula, nombre, grado_curso, correo_institucional, sancionado } = req.body;
    const lectorActualizado = await Lector.findByIdAndUpdate(
      id,
      { matricula, nombre, grado_curso, correo_institucional, sancionado },
      { new: true, runValidators: true }
    );

    if (!lectorActualizado) {
      return res.status(404).json({
        success: false,
        message: 'Lector no encontrado para actualizar'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lector actualizado exitosamente',
      data: lectorActualizado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// PATCH /api/lectores/:id/sancion
const cambiarEstadoSancion = async (req, res) => {
  try {
    const { id } = req.params;
    const { sancionado } = req.body;

    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID con formato de MongoDB inválido'
      });
    }

    if (typeof sancionado !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "El campo 'sancionado' debe ser booleano (true o false)"
      });
    }

    const lector = await Lector.findByIdAndUpdate(
      id,
      { sancionado },
      { new: true, runValidators: true }
    );

    if (!lector) {
      return res.status(404).json({
        success: false,
        message: 'Lector no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Estado de sanción actualizado a: ${sancionado}`,
      data: lector
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// DELETE /api/lectores/:id
const eliminarLector = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID con formato de MongoDB inválido'
      });
    }

    const lectorEliminado = await Lector.findByIdAndDelete(id);
    if (!lectorEliminado) {
      return res.status(404).json({
        success: false,
        message: 'Lector no encontrado para eliminar'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lector eliminado exitosamente',
      data: lectorEliminado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

module.exports = {
  crearLector,
  obtenerLectores,
  obtenerLectorPorId,
  actualizarLector,
  cambiarEstadoSancion,
  eliminarLector
};