const express = require('express');
const router = express.Router();
const Usuario = require('../models/modelUsuario');
const { subirFotoPerfil } = require('../middlewares/subirArchivos');

// Mostrar página de login
router.get('/login', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null, success: null });
});

// Procesar login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const usuario = await Usuario.findOne({ username, activo: true });
    
    if (!usuario) {
      return res.render('auth/login', { 
        error: 'Usuario no encontrado o inactivo', 
        success: null 
      });
    }
    
    // Verificar contraseña (en producción usar bcrypt)
    if (usuario.password !== password) {
      return res.render('auth/login', { 
        error: 'Contraseña incorrecta', 
        success: null 
      });
    }
    
    // Crear sesión
    req.session.usuario = {
      id: usuario._id,
      username: usuario.username,
      role: usuario.role,
      fotoPerfil: usuario.fotoPerfil
    };
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en login:', error);
    res.render('auth/login', { 
      error: 'Error al iniciar sesión', 
      success: null 
    });
  }
});

// Mostrar página de registro
router.get('/registro', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/dashboard');
  }
  res.render('auth/registro', { error: null, success: null });
});

// Procesar registro
router.post('/registro', (req, res) => {
  subirFotoPerfil(req, res, async function(err) {
    try {
      if (err) {
        console.error('Error al subir foto:', err);
      }
      
      const { username, password, confirmPassword } = req.body;
      
      // Validaciones
      if (password !== confirmPassword) {
        return res.render('auth/registro', { 
          error: 'Las contraseñas no coinciden', 
          success: null 
        });
      }
      
      // Verificar si ya existe el username
      const existeUsername = await Usuario.findOne({ username });
      if (existeUsername) {
        return res.render('auth/registro', { 
          error: 'El nombre de usuario ya existe', 
          success: null 
        });
      }
      
      // Crear nuevo usuario (siempre como usuario normal)
      const nuevoUsuario = new Usuario({
        username,
        password, // En producción usar bcrypt
        role: 'usuario',
        fotoPerfil: req.file ? '/uploads/perfiles/' + req.file.filename : null
      });
      
      await nuevoUsuario.save();
      
      res.render('auth/login', { 
        error: null, 
        success: 'Registro exitoso. Ahora puedes iniciar sesión.' 
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.render('auth/registro', { 
        error: 'Error al registrar usuario', 
        success: null 
      });
    }
  });
});

// Cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    }
    res.clearCookie('biblioteca_session');
    res.redirect('/');
  });
});

module.exports = router;
