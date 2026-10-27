const mongoose = require('mongoose');

const libroSchema = new mongoose.Schema(
  {
    isbn: {
      type: String,
      required: [true, 'El ISBN es obligatorio'],
      unique: true,
      trim: true,
      maxlength: [20, 'El ISBN no puede exceder los 20 caracteres'],
      validate: {
        validator: function (valor) {
          if (!valor) return false;
          const digitos = valor.replace(/[-\s]/g, '');
          return /^(\d{10}|\d{13}|\d{9}[\dXx])$/.test(digitos);
        },
        message: 'El ISBN debe tener 10 o 13 dígitos y máximo 20 caracteres'
      }
    },
    titulo: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [150, 'El título no puede exceder los 150 caracteres']
    },
    anio: {
      type: Number,
      default: null,
      validate: {
        validator: function (valor) {
          if (valor === null || valor === undefined) return true;
          return Number.isInteger(valor) && valor <= new Date().getFullYear();
        },
        message: 'El año debe ser un número entero y no puede ser un año futuro'
      }
    },
    ejemplares_disponibles: {
      type: Number,
      required: [true, 'Los ejemplares disponibles son obligatorios'],
      default: 0,
      min: [0, 'Los ejemplares disponibles deben ser mayores o iguales a 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Los ejemplares disponibles deben ser un número entero'
      }
    },
    autor_id: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Autor'
        }
      ],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'El autor_id es obligatorio y debe contener al menos un autor'
      }
    }
  },
  {
    collection: 'libros',
    timestamps: false,
    versionKey: false
  }
);

module.exports = mongoose.model('Libro', libroSchema, 'libros');