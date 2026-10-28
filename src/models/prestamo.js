const mongoose = require('mongoose');

const prestamoSchema = new mongoose.Schema(
  {
    libro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Libro',
      required: [true, 'El ID del libro es obligatorio']
    },
    lector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lector',
      required: [true, 'El ID del lector es obligatorio']
    },
    fechaPrestamo: {
      type: Date,
      default: Date.now,
      required: true
    },
    fechaDevolucionEstimada: {
      type: Date,
      required: [true, 'La fecha estimada de devolución es obligatoria']
    },
    fechaDevolucionReal: {
      type: Date,
      default: null
    },
    estado: {
      type: String,
      enum: {
        values: ['Activo', 'Devuelto', 'Retrasado'],
        message: '{VALUE} no es un estado válido'
      },
      default: 'Activo'
    },
    observaciones: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'prestamos',
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Prestamo', prestamoSchema, 'prestamos');

