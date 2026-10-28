const mongoose = require('mongoose');
const Libro = require('../models/libro');

const esIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

const existeAutor = async (idAutor) => {
  if (mongoose.models.Autor) {
    const autor = await mongoose.model('Autor').findById(idAutor);
    return !!autor;
  }
  const autorEncontrado = await mongoose.connection.collection('autores').findOne({
    _id: new mongoose.Types.ObjectId(idAutor)
  });
  return !!autorEncontrado;
};

const tienePrestamosActivosORetrasados = async (idLibro) => {
  const idLibroObjectId = new mongoose.Types.ObjectId(idLibro);
  if (mongoose.models.Prestamo) {
    const prestamoActivo = await mongoose.model('Prestamo').findOne({
      libro: idLibroObjectId,
      estado: { $in: ['Activo', 'Retrasado'] }
    });
    return !!prestamoActivo;
  }
  const prestamoEncontrado = await mongoose.connection.collection('prestamos').findOne({
    libro: idLibroObjectId,
    estado: { $in: ['Activo', 'Retrasado'] }
  });
  return !!prestamoEncontrado;
};

const validarAutores = async (autorId) => {
  if (!autorId) return null;
  const listaAutores = Array.isArray(autorId) ? autorId : [autorId];

  for (const idAutor of listaAutores) {
    if (!esIdValido(idAutor)) {
      return { error: { status: 400, mensaje: 'ID de autor con formato inválido' } };
    }
    const existe = await existeAutor(idAutor);
    if (!existe) {
      return { error: { status: 404, mensaje: 'El autor especificado no existe' } };
    }
  }

  return { autoresValidados: listaAutores };
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

// POST /api/libros
const crearLibro = async (req, res) => {
  try {
    const { isbn, titulo, anio } = req.body;
    const ejemplaresDisponibles = req.body.ejemplaresDisponibles ?? req.body.ejemplares_disponibles;
    const autorId = req.body.autorId ?? req.body.autor_id;

    let autoresParaGuardar;
    if (autorId) {
      const validacionAutores = await validarAutores(autorId);
      if (validacionAutores?.error) {
        return res.status(validacionAutores.error.status).json({
          success: false,
          mensaje: validacionAutores.error.mensaje
        });
      }
      autoresParaGuardar = validacionAutores.autoresValidados;
    }

    const nuevoLibro = await Libro.create({
      isbn,
      titulo,
      anio,
      ejemplaresDisponibles,
      autorId: autoresParaGuardar
    });

    return res.status(201).json({
      success: true,
      mensaje: 'Libro registrado exitosamente',
      data: nuevoLibro
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// GET /api/libros
const obtenerLibros = async (req, res) => {
  try {
    const filtrosDeBusqueda = {};
    const autorFiltro = req.query.autorId || req.query.autor_id;

    if (autorFiltro) {
      if (!esIdValido(autorFiltro)) {
        return res.status(400).json({
          success: false,
          mensaje: 'ID de autor inválido para filtrar'
        });
      }
      filtrosDeBusqueda.$or = [
        { autorId: autorFiltro },
        { autor_id: autorFiltro }
      ];
    }

    if (req.query.isbn) filtrosDeBusqueda.isbn = req.query.isbn.trim();
    if (req.query.titulo) filtrosDeBusqueda.titulo = { $regex: req.query.titulo.trim(), $options: 'i' };

    const librosObtenidos = await Libro.find(filtrosDeBusqueda).populate('autorId');
    return res.status(200).json({
      success: true,
      count: librosObtenidos.length,
      data: librosObtenidos
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// GET /api/libros/:id
const obtenerLibroPorId = async (req, res) => {
  try {
    const { id: idLibro } = req.params;
    if (!esIdValido(idLibro)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const libroEncontrado = await Libro.findById(idLibro).populate('autorId');
    if (!libroEncontrado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Libro no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: libroEncontrado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// PUT /api/libros/:id
const actualizarLibro = async (req, res) => {
  try {
    const { id: idLibro } = req.params;
    if (!esIdValido(idLibro)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const { isbn, titulo, anio } = req.body;
    const ejemplaresDisponibles = req.body.ejemplaresDisponibles ?? req.body.ejemplares_disponibles;
    const autorId = req.body.autorId ?? req.body.autor_id;

    const camposParaActualizar = {};
    if (isbn !== undefined) camposParaActualizar.isbn = isbn;
    if (titulo !== undefined) camposParaActualizar.titulo = titulo;
    if (anio !== undefined) camposParaActualizar.anio = anio;
    if (ejemplaresDisponibles !== undefined) {
      camposParaActualizar.ejemplaresDisponibles = ejemplaresDisponibles;
      camposParaActualizar.ejemplares_disponibles = ejemplaresDisponibles;
    }

    if (autorId !== undefined) {
      const validacionAutores = await validarAutores(autorId);
      if (validacionAutores?.error) {
        return res.status(validacionAutores.error.status).json({
          success: false,
          mensaje: validacionAutores.error.mensaje
        });
      }
      camposParaActualizar.autorId = validacionAutores.autoresValidados;
    }

    const libroActualizado = await Libro.findByIdAndUpdate(
      idLibro,
      camposParaActualizar,
      { new: true, runValidators: true }
    ).populate('autorId');

    if (!libroActualizado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Libro no encontrado para actualizar'
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: 'Libro actualizado exitosamente',
      data: libroActualizado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

// DELETE /api/libros/:id
const eliminarLibro = async (req, res) => {
  try {
    const { id: idLibro } = req.params;
    if (!esIdValido(idLibro)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID con formato inválido'
      });
    }

    const libroAEliminar = await Libro.findById(idLibro);
    if (!libroAEliminar) {
      return res.status(404).json({
        success: false,
        mensaje: 'Libro no encontrado para eliminar'
      });
    }

    const tienePrestamos = await tienePrestamosActivosORetrasados(idLibro);
    if (tienePrestamos) {
      return res.status(409).json({
        success: false,
        mensaje: 'No se puede eliminar un libro con préstamos Activos o Retrasados'
      });
    }

    const libroEliminado = await Libro.findByIdAndDelete(idLibro);
    return res.status(200).json({
      success: true,
      mensaje: 'Libro eliminado exitosamente',
      data: libroEliminado
    });
  } catch (error) {
    return manejarError(res, error);
  }
};

module.exports = {
  crearLibro,
  obtenerLibros,
  obtenerLibroPorId,
  actualizarLibro,
  eliminarLibro
};
