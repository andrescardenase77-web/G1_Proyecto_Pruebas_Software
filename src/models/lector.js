const mongoose = require('mongoose');

const lectorSchema = new mongoose.Schema(
  {
    matricula: {
      type: String,
      required: [true, 'La matrícula es obligatoria'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'La matrícula no puede exceder los 20 caracteres']
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
    },
    grado_curso: {
      type: String,
      trim: true,
      maxlength: [50, 'El grado/curso no puede exceder los 50 caracteres'],
      default: null
    },
    correo_institucional: {
      type: String,
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [100, 'El correo no puede exceder los 100 caracteres'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Formato de correo institucional inválido'
      ]
    },
    sancionado: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    collection: 'lectores',
    timestamps: false,
    versionKey: false
  }
);

module.exports = mongoose.model('Lector', lectorSchema);