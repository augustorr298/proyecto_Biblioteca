const express = require('express');
const router = express.Router();
const Usuario = require('../models/modelUsuario');
const { subirFotoPerfil } = require('../middlewares/subirArchivos');
const fs = require('fs');
const path = require('path');

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
        return res.render('auth/registro', { 
          error: 'Error al subir la foto: ' + err.message, 
          success: null 
        });
      }
      
      console.log('Archivo recibido:', req.file); // Debug log
      
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
      const fotoPerfil = req.file ? '/uploads/perfiles/' + req.file.filename : null;
      console.log('Foto de perfil guardada:', fotoPerfil); // Debug log
      
      const nuevoUsuario = new Usuario({
        username,
        password, // En producción usar bcrypt
        role: 'usuario',
        fotoPerfil: fotoPerfil
      });
      
      await nuevoUsuario.save();
      console.log('Usuario creado:', nuevoUsuario); // Debug log
      
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

// Función auxiliar para eliminar archivo físico
function eliminarArchivoFisico(rutaArchivo) {
  if (rutaArchivo) {
    const rutaCompleta = path.join(__dirname, '..', 'public', rutaArchivo);
    if (fs.existsSync(rutaCompleta)) {
      fs.unlinkSync(rutaCompleta);
      console.log('Archivo eliminado:', rutaCompleta);
      return true;
    }
  }
  return false;
}

// Ver perfil
router.get('/perfil', async (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  try {
    const usuario = await Usuario.findById(req.session.usuario.id);
    if (!usuario) {
      return res.redirect('/logout');
    }
    
    // Actualizar sesión con datos frescos
    req.session.usuario.fotoPerfil = usuario.fotoPerfil;
    
    res.render('perfil', { 
      usuario: req.session.usuario,
      mensaje: null,
      tipoMensaje: null
    });
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    res.redirect('/dashboard');
  }
});

// Subir/Cambiar foto de perfil
router.post('/perfil/foto', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  subirFotoPerfil(req, res, async function(err) {
    try {
      if (err) {
        console.error('Error al subir foto:', err);
        return res.render('perfil', {
          usuario: req.session.usuario,
          mensaje: 'Error al subir la foto: ' + err.message,
          tipoMensaje: 'error'
        });
      }
      
      if (!req.file) {
        return res.render('perfil', {
          usuario: req.session.usuario,
          mensaje: 'No se seleccionó ninguna imagen',
          tipoMensaje: 'error'
        });
      }
      
      const usuario = await Usuario.findById(req.session.usuario.id);
      
      // Eliminar foto anterior si existe
      if (usuario.fotoPerfil) {
        eliminarArchivoFisico(usuario.fotoPerfil);
      }
      
      // Guardar nueva foto
      const nuevaFoto = '/uploads/perfiles/' + req.file.filename;
      usuario.fotoPerfil = nuevaFoto;
      await usuario.save();
      
      // Actualizar sesión
      req.session.usuario.fotoPerfil = nuevaFoto;
      
      res.render('perfil', {
        usuario: req.session.usuario,
        mensaje: 'Foto de perfil actualizada correctamente',
        tipoMensaje: 'success'
      });
    } catch (error) {
      console.error('Error al actualizar foto:', error);
      res.render('perfil', {
        usuario: req.session.usuario,
        mensaje: 'Error al actualizar la foto',
        tipoMensaje: 'error'
      });
    }
  });
});

// Eliminar foto de perfil
router.post('/perfil/foto/eliminar', async (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  try {
    const usuario = await Usuario.findById(req.session.usuario.id);
    
    // Eliminar archivo físico
    if (usuario.fotoPerfil) {
      eliminarArchivoFisico(usuario.fotoPerfil);
    }
    
    // Quitar referencia en BD
    usuario.fotoPerfil = null;
    await usuario.save();
    
    // Actualizar sesión
    req.session.usuario.fotoPerfil = null;
    
    res.render('perfil', {
      usuario: req.session.usuario,
      mensaje: 'Foto de perfil eliminada',
      tipoMensaje: 'success'
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.render('perfil', {
      usuario: req.session.usuario,
      mensaje: 'Error al eliminar la foto',
      tipoMensaje: 'error'
    });
  }
});

// Cambiar contraseña
router.post('/perfil/password', async (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  try {
    const { passwordActual, passwordNueva, passwordConfirmar } = req.body;
    
    if (passwordNueva !== passwordConfirmar) {
      return res.render('perfil', {
        usuario: req.session.usuario,
        mensaje: 'Las contraseñas nuevas no coinciden',
        tipoMensaje: 'error'
      });
    }
    
    const usuario = await Usuario.findById(req.session.usuario.id);
    
    if (usuario.password !== passwordActual) {
      return res.render('perfil', {
        usuario: req.session.usuario,
        mensaje: 'La contraseña actual es incorrecta',
        tipoMensaje: 'error'
      });
    }
    
    usuario.password = passwordNueva;
    await usuario.save();
    
    res.render('perfil', {
      usuario: req.session.usuario,
      mensaje: 'Contraseña actualizada correctamente',
      tipoMensaje: 'success'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.render('perfil', {
      usuario: req.session.usuario,
      mensaje: 'Error al cambiar la contraseña',
      tipoMensaje: 'error'
    });
  }
});

module.exports = router;
