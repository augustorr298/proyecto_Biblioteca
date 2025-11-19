const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema({
  diasMaxPrestamo: {
    type: Number,
    default: 15,
    min: 1,
    max: 90
  }
});

module.exports = mongoose.model('Configuracion', configuracionSchema);
