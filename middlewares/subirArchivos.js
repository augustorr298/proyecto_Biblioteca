const multer = require('multer');
const path = require('path');

// Configuración para subir portadas de libros
const storageLibros = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/libros');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Configuración para subir fotos de perfil
const storagePerfiles = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/perfiles');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Filtro para solo permitir imágenes
const imageFilter = function(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
};

// Middleware para subir portada de libro
const subirImagenLibro = multer({
  storage: storageLibros,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: imageFilter
}).single('imagen');

// Middleware para subir foto de perfil
const subirFotoPerfil = multer({
  storage: storagePerfiles,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: imageFilter
}).single('fotoPerfil');

module.exports = {
  subirImagenLibro,
  subirFotoPerfil
};
