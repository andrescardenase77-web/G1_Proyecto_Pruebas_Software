const Prestamo = require('../models/prestamo.model');
const Libro = require('../models/libro.model');
const Lector = require('../models/lector.model');

// 1. Obtener todos los préstamos
exports.obtenerPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.find()
      .populate('libro', 'titulo isbn autor ejemplaresDisponibles')
      .populate('lector', 'nombre matricula correoInstitucional sancionado');
    res.status(200).json(prestamos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener préstamos', error: error.message });
  }
};

// 2. Reporte de préstamos vencidos / con retraso
exports.obtenerPrestamosRetrasados = async (req, res) => {
  try {
    const hoy = new Date();
    const prestamosRetrasados = await Prestamo.find({
      estado: 'Activo',
      fechaDevolucionEstimada: { $lt: hoy }
    })
      .populate('libro', 'titulo isbn')
      .populate('lector', 'nombre matricula correoInstitucional');

    res.status(200).json(prestamosRetrasados);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar préstamos retrasados', error: error.message });
  }
};

// 3. Historial de préstamos de un lector
exports.obtenerHistorialPorLector = async (req, res) => {
  try {
    const { lectorId } = req.params;
    const historial = await Prestamo.find({ lector: lectorId })
      .populate('libro', 'titulo isbn')
      .sort({ fechaPrestamo: -1 });

    res.status(200).json(historial);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener historial del lector', error: error.message });
  }
};

// 4. Obtener un préstamo por ID
exports.obtenerPrestamoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findById(id)
      .populate('libro')
      .populate('lector');

    if (!prestamo) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }

    res.status(200).json(prestamo);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el préstamo', error: error.message });
  }
};

// 5. Crear un nuevo préstamo (con todas las reglas de negocio)
exports.crearPrestamo = async (req, res) => {
  try {
    const { libro, lector, fechaDevolucionEstimada, observaciones } = req.body;
    const fechaInicio = new Date();
    const fechaEstimada = new Date(fechaDevolucionEstimada);

    // Regla: Validación cronológica de fechas
    if (fechaEstimada <= fechaInicio) {
      return res.status(400).json({
        mensaje: 'La fecha de devolución estimada debe ser estrictamente posterior a la fecha actual'
      });
    }

    // Regla: Validar existencia del lector
    const lectorDoc = await Lector.findById(lector);
    if (!lectorDoc) {
      return res.status(404).json({ mensaje: 'El lector especificado no existe' });
    }

    // Regla: Verificar sanción del lector (403 Forbidden)
    if (lectorDoc.sancionado) {
      return res.status(403).json({
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
        mensaje: 'El lector ya alcanzó el límite máximo de 3 préstamos activos simultáneos'
      });
    }

    // Regla: Validar existencia y stock del libro
    const libroDoc = await Libro.findById(libro);
    if (!libroDoc) {
      return res.status(404).json({ mensaje: 'El libro especificado no existe' });
    }
    if (libroDoc.ejemplaresDisponibles <= 0) {
      return res.status(400).json({
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

    // Regla: Descuento automático de inventario
    libroDoc.ejemplaresDisponibles -= 1;
    await libroDoc.save();

    res.status(201).json({
      mensaje: 'Préstamo registrado exitosamente',
      prestamo: prestamoGuardado
    });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al registrar el préstamo', error: error.message });
  }
};

// 6. Proceso formal de devolución de libro
exports.devolverLibro = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findById(id);

    if (!prestamo) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }

    if (prestamo.estado === 'Devuelto') {
      return res.status(400).json({ mensaje: 'Este préstamo ya fue devuelto previamente' });
    }

    const fechaReal = new Date();
    prestamo.fechaDevolucionReal = fechaReal;
    prestamo.estado = 'Devuelto';
    await prestamo.save();

    // Reintegrar ejemplar al stock
    await Libro.findByIdAndUpdate(prestamo.libro, { $inc: { ejemplaresDisponibles: 1 } });

    // Regla: Si se devuelve después de la fecha estimada, sancionar al lector
    let mensajeSancion = 'Devolución dentro del plazo previsto.';
    if (fechaReal > new Date(prestamo.fechaDevolucionEstimada)) {
      await Lector.findByIdAndUpdate(prestamo.lector, { sancionado: true });
      mensajeSancion = 'Devolución fuera de plazo: se aplicó una sanción al lector.';
    }

    res.status(200).json({
      mensaje: 'Devolución procesada con éxito',
      detalle: mensajeSancion,
      prestamo
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar la devolución', error: error.message });
  }
};

// 7. Actualizar préstamo (PUT estándar)
exports.actualizarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamoActualizado = await Prestamo.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!prestamoActualizado) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }

    res.status(200).json({
      mensaje: 'Préstamo actualizado exitosamente',
      prestamo: prestamoActualizado
    });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar el préstamo', error: error.message });
  }
};

// 8. Eliminar préstamo
exports.eliminarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findById(id);

    if (!prestamo) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }

    // Si aún estaba activo, restituir el ejemplar
    if (prestamo.estado === 'Activo') {
      await Libro.findByIdAndUpdate(prestamo.libro, { $inc: { ejemplaresDisponibles: 1 } });
    }

    await Prestamo.findByIdAndDelete(id);
    res.status(200).json({ mensaje: 'Préstamo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el préstamo', error: error.message });
  }
};