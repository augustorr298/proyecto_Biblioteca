const express = require('express');
const router = express.Router();
const Usuario = require('../models/modelUsuario');
const { verificarAdmin } = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

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

// Listar todos los usuarios (solo admin)
router.get('/', verificarAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ fechaRegistro: -1 });
    res.render('admin/usuarios', { 
      usuarios,
      usuario: req.session.usuario 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar usuarios');
  }
});

// Cambiar rol de usuario a administrador (solo admin)
router.post('/:id/hacerAdmin', verificarAdmin, async (req, res) => {
  try {
    const usuarioModificar = await Usuario.findById(req.params.id);
    
    if (!usuarioModificar) {
      return res.send(`
        <script>
          alert('Usuario no encontrado');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    await Usuario.findByIdAndUpdate(req.params.id, { role: 'administrador' });
    
    res.redirect('/admin/usuarios');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cambiar rol de usuario');
  }
});

// Cambiar rol de administrador a usuario (solo admin)
router.post('/:id/hacerUsuario', verificarAdmin, async (req, res) => {
  try {
    const usuarioModificar = await Usuario.findById(req.params.id);
    
    if (!usuarioModificar) {
      return res.send(`
        <script>
          alert('Usuario no encontrado');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    // No permitir quitarse el admin a sí mismo
    if (usuarioModificar._id.toString() === req.session.usuario.id.toString()) {
      return res.send(`
        <script>
          alert('No puedes quitarte el rol de administrador a ti mismo');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    await Usuario.findByIdAndUpdate(req.params.id, { role: 'usuario' });
    
    res.redirect('/admin/usuarios');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cambiar rol de usuario');
  }
});

// Activar/Desactivar usuario (solo admin)
router.post('/:id/toggleActivo', verificarAdmin, async (req, res) => {
  try {
    const usuarioModificar = await Usuario.findById(req.params.id);
    
    if (!usuarioModificar) {
      return res.send(`
        <script>
          alert('Usuario no encontrado');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    // No permitir desactivarse a sí mismo
    if (usuarioModificar._id.toString() === req.session.usuario.id.toString()) {
      return res.send(`
        <script>
          alert('No puedes desactivarte a ti mismo');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    await Usuario.findByIdAndUpdate(req.params.id, { 
      activo: !usuarioModificar.activo 
    });
    
    res.redirect('/admin/usuarios');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cambiar estado de usuario');
  }
});

// Eliminar usuario permanentemente (solo admin)
router.post('/:id/eliminar', verificarAdmin, async (req, res) => {
  try {
    const usuarioEliminar = await Usuario.findById(req.params.id);
    
    if (!usuarioEliminar) {
      return res.send(`
        <script>
          alert('Usuario no encontrado');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    // No permitir eliminarse a sí mismo
    if (usuarioEliminar._id.toString() === req.session.usuario.id.toString()) {
      return res.send(`
        <script>
          alert('No puedes eliminarte a ti mismo');
          window.location.href = '/admin/usuarios';
        </script>
      `);
    }
    
    // Eliminar foto de perfil física si existe
    if (usuarioEliminar.fotoPerfil) {
      eliminarArchivoFisico(usuarioEliminar.fotoPerfil);
    }
    
    // Eliminar usuario de la BD
    await Usuario.findByIdAndDelete(req.params.id);
    
    res.send(`
      <script>
        alert('Usuario eliminado permanentemente');
        window.location.href = '/admin/usuarios';
      </script>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar usuario');
  }
});

module.exports = router;
