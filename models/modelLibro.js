const mongoose = require('mongoose');

const libroSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true
  },
  autor: {
    type: String,
    required: true
  },
  genero: {
    type: String,
    required: true
  },
  anio: {
    type: Number,
    required: true
  },
  cantidadTotal: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  cantidadDisponible: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  agotado: {
    type: Boolean,
    default: false
  },
  imagen: {
    type: String,
    default: null
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

// Virtual para verificar si hay libros disponibles
libroSchema.virtual('disponible').get(function() {
  return this.cantidadDisponible > 0 && !this.agotado;
});

module.exports = mongoose.model('Libro', libroSchema);