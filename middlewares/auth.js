// Middleware para verificar si el usuario tiene sesión activa
const verificarSesion = (req, res, next) => {
  if (req.session && req.session.usuario) {
    // Pasar información del usuario a todas las vistas
    res.locals.usuario = req.session.usuario;
    next();
  } else {
    res.redirect('/');
  }
};

// Middleware para verificar si el usuario es administrador
const verificarAdmin = (req, res, next) => {
  if (req.session && req.session.usuario && req.session.usuario.role === 'administrador') {
    res.locals.usuario = req.session.usuario;
    next();
  } else {
    res.status(403).render('error', { 
      mensaje: 'Acceso denegado: Solo administradores pueden acceder a esta sección',
      usuario: req.session ? req.session.usuario : null
    });
  }
};

// Middleware para verificar si es usuario normal (puede ver pero no modificar)
const verificarUsuarioNormal = (req, res, next) => {
  if (req.session && req.session.usuario) {
    res.locals.usuario = req.session.usuario;
    next();
  } else {
    res.redirect('/');
  }
};

// Middleware para pasar usuario a las vistas (sin bloquear)
const pasarUsuario = (req, res, next) => {
  if (req.session && req.session.usuario) {
    res.locals.usuario = req.session.usuario;
  } else {
    res.locals.usuario = null;
  }
  next();
};

module.exports = {
  verificarSesion,
  verificarAdmin,
  verificarUsuarioNormal,
  pasarUsuario
};
