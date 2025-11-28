const mongoose = require('mongoose');

const prestamoSchema = new mongoose.Schema({
  libroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Libro',
    required: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  nombreUsuario: {
    type: String,
    required: true
  },
  fechaPrestamo: {
    type: Date,
    default: Date.now
  },
  fechaDevolucion: {
    type: Date,
    required: true
  },
  devuelto: {
    type: Boolean,
    default: false
  },
  fechaDevolucionReal: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Prestamo', prestamoSchema);