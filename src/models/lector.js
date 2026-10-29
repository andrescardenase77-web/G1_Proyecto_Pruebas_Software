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
    gradoCurso: {
      type: String,
      alias: 'grado_curso',
      trim: true,
      maxlength: [50, 'El grado/curso no puede exceder los 50 caracteres'],
      default: null
    },
    correoInstitucional: {
      type: String,
      alias: 'correo_institucional',
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [100, 'El correo no puede exceder los 100 caracteres'],
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
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
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

module.exports = mongoose.model('Lector', lectorSchema, 'lectores');
