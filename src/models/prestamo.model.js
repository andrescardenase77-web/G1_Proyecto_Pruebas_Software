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
    timestamps: true
  }
);

// El tercer argumento asegura que se conecte a la colección 'Préstamo' con tilde que está en Atlas
module.exports = mongoose.model('Prestamo', prestamoSchema, 'Préstamo');