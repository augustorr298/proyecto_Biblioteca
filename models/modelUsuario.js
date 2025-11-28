const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['administrador', 'usuario'],
    default: 'usuario'
  },
  fotoPerfil: {
    type: String,
    default: null
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
