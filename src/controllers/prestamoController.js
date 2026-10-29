const mongoose = require('mongoose');
const Libro = require('../models/libro');
const Lector = require('../models/lector');
const Prestamo = require('../models/prestamo');

const esIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

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

// 1. Obtener todos los préstamos
const obtenerPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.find()
      .populate('libro', 'titulo isbn autor ejemplaresDisponibles ejemplares_disponibles')
      .populate('lector', 'nombre matricula correoInstitucional correo_institucional sancionado');

    return res.status(200).json({
      success: true,
      count: prestamos.length,
      data: prestamos
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 2. Reporte de préstamos vencidos / con retraso
const obtenerPrestamosRetrasados = async (req, res) => {
  try {
    const hoy = new Date();
    const prestamosRetrasados = await Prestamo.find({
      estado: 'Activo',
      fechaDevolucionEstimada: { $lt: hoy }
    })
      .populate('libro', 'titulo isbn')
      .populate('lector', 'nombre matricula correoInstitucional correo_institucional');

    return res.status(200).json({
      success: true,
      count: prestamosRetrasados.length,
      data: prestamosRetrasados
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 3. Historial de préstamos de un lector
const obtenerHistorialPorLector = async (req, res) => {
  try {
    const { lectorId } = req.params;
    if (!esIdValido(lectorId)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de lector con formato inválido'
      });
    }

    const historial = await Prestamo.find({ lector: lectorId })
      .populate('libro', 'titulo isbn')
      .sort({ fechaPrestamo: -1 });

    return res.status(200).json({
      success: true,
      count: historial.length,
      data: historial
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 4. Obtener un préstamo por ID
const obtenerPrestamoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const prestamo = await Prestamo.findById(id)
      .populate('libro')
      .populate('lector');

    if (!prestamo) {
      return res.status(404).json({
        success: false,
        mensaje: 'Préstamo no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: prestamo
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 5. Crear un nuevo préstamo
const crearPrestamo = async (req, res) => {
  try {
    const { libro, lector, fechaDevolucionEstimada, observaciones } = req.body;

    if (!esIdValido(libro)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de libro con formato inválido'
      });
    }

    if (!esIdValido(lector)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de lector con formato inválido'
      });
    }

    if (!fechaDevolucionEstimada) {
      return res.status(400).json({
        success: false,
        mensaje: 'La fecha estimada de devolución es obligatoria'
      });
    }
//correcion una vez evaluado con sonarque
     const fechaInicio = new Date();
     const fechaEstimada = new Date(fechaDevolucionEstimada);

      if (Number.isNaN(fechaEstimada.getTime())) {
      return res.status(400).json({
        success: false,
        mensaje: 'La fecha estimada de devolución no tiene un formato válido'
      });
    }

    // Regla: Validación cronológica de fechas
    if (fechaEstimada <= fechaInicio) {
      return res.status(400).json({
        success: false,
        mensaje: 'La fecha de devolución estimada debe ser estrictamente posterior a la fecha actual'
      });
    }

    // Regla: Validar existencia del lector
    const lectorDoc = await Lector.findById(lector);
    if (!lectorDoc) {
      return res.status(404).json({
        success: false,
        mensaje: 'El lector especificado no existe'
      });
    }

    // Regla: Verificar sanción del lector (403 Forbidden)
    if (lectorDoc.sancionado) {
      return res.status(403).json({
        success: false,
        mensaje: 'El lector tiene sanciones activas y no puede solicitar préstamos'
      });
    }

    // Regla: Límite de 3 préstamos activos en paralelo
    const prestamosActivos = await Prestamo.countDocuments({
      lector: lector,
      estado: 'Activo'
    });
    if (prestamosActivos >= 3) {
      return res.status(400).json({
        success: false,
        mensaje: 'El lector ya alcanzó el límite máximo de 3 préstamos activos simultáneos'
      });
    }

    // Regla: Validar existencia y stock del libro
    const libroDoc = await Libro.findById(libro);
    if (!libroDoc) {
      return res.status(404).json({
        success: false,
        mensaje: 'El libro especificado no existe'
      });
    }

    const stockActual = libroDoc.ejemplaresDisponibles ?? libroDoc.ejemplares_disponibles ?? 0;
    if (stockActual <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No hay ejemplares disponibles de este libro para préstamo'
      });
    }

    // Crear registro
    const nuevoPrestamo = new Prestamo({
      libro,
      lector,
      fechaPrestamo: fechaInicio,
      fechaDevolucionEstimada: fechaEstimada,
      observaciones
    });

    const prestamoGuardado = await nuevoPrestamo.save();

    // Descuento automático de inventario (actualiza ambos para total compatibilidad)
    await Libro.findByIdAndUpdate(libro, {
      $inc: {
        ejemplaresDisponibles: -1,
        ejemplares_disponibles: -1
      }
    });

    return res.status(201).json({
      success: true,
      mensaje: 'Préstamo registrado exitosamente',
      data: prestamoGuardado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 6. Proceso formal de devolución de libro
const devolverLibro = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const prestamo = await Prestamo.findById(id);
    if (!prestamo) {
      return res.status(404).json({
        success: false,
        mensaje: 'Préstamo no encontrado'
      });
    }

    if (prestamo.estado === 'Devuelto') {
      return res.status(400).json({
        success: false,
        mensaje: 'Este préstamo ya fue devuelto previamente'
      });
    }

    const fechaReal = new Date();
    prestamo.fechaDevolucionReal = fechaReal;
    prestamo.estado = 'Devuelto';
    await prestamo.save();

    // Reintegrar ejemplar al stock
    await Libro.findByIdAndUpdate(prestamo.libro, {
      $inc: {
        ejemplaresDisponibles: 1,
        ejemplares_disponibles: 1
      }
    });

    // Regla: Si se devuelve después de la fecha estimada, sancionar al lector
    let mensajeSancion = 'Devolución dentro del plazo previsto.';
    if (fechaReal > new Date(prestamo.fechaDevolucionEstimada)) {
      await Lector.findByIdAndUpdate(prestamo.lector, { sancionado: true });
      mensajeSancion = 'Devolución fuera de plazo: se aplicó una sanción al lector.';
    }

    return res.status(200).json({
      success: true,
      mensaje: 'Devolución procesada con éxito',
      detalle: mensajeSancion,
      data: prestamo
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 7. Actualizar préstamo (PUT estándar)
const actualizarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!prestamoActualizado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Préstamo no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: 'Préstamo actualizado exitosamente',
      data: prestamoActualizado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// 8. Eliminar préstamo
const eliminarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const prestamo = await Prestamo.findById(id);
    if (!prestamo) {
      return res.status(404).json({
        success: false,
        mensaje: 'Préstamo no encontrado'
      });
    }

    // Si aún estaba activo, restituir el ejemplar
    if (prestamo.estado === 'Activo') {
      await Libro.findByIdAndUpdate(prestamo.libro, {
        $inc: {
          ejemplaresDisponibles: 1,
          ejemplares_disponibles: 1
        }
      });
    }

    await Prestamo.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      mensaje: 'Préstamo eliminado exitosamente'
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

module.exports = {
  obtenerPrestamos,
  obtenerPrestamosRetrasados,
  obtenerHistorialPorLector,
  obtenerPrestamoPorId,
  crearPrestamo,
  devolverLibro,
  actualizarPrestamo,
  eliminarPrestamo
};

