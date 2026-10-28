const mongoose = require('mongoose');

const autorSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede superar 100 caracteres'],
  },
  nacionalidad: {
    type: String,
    trim: true,
    maxlength: [50, 'La nacionalidad no puede superar 50 caracteres'],
  },
  sitio_web: {
    type: String,
    trim: true,
    maxlength: [150, 'El sitio web no puede superar 150 caracteres'],
    match: [/^https?:\/\/\S+\.\S+$/, 'El sitio web debe ser una URL válida (http:// o https://)'],
  },
  anio_nacimiento: {
    type: Number,
    validate: [
      {
        validator: Number.isInteger,
        message: 'El año de nacimiento debe ser un número entero',
      },
      {
        validator: (anio) => anio <= new Date().getFullYear(),
        message: 'El año de nacimiento no puede ser futuro',
      },
    ],
  },
}, {
  collection: 'autores',
  timestamps: false,
  versionKey: false,
});

module.exports = mongoose.model('Autor', autorSchema, 'autores');
