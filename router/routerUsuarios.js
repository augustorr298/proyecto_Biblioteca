const express = require('express');
const router = express.Router();
const Usuario = require('../models/modelUsuario');
const { verificarAdmin } = require('../middlewares/auth');

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

module.exports = router;
