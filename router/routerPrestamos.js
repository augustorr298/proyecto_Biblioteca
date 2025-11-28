const express = require('express');
const router = express.Router();
const Prestamo = require('../models/modelPrestamo');
const Libro = require('../models/modelLibro');
const Usuario = require('../models/modelUsuario');
const { verificarAdmin } = require('../middlewares/auth');

// Mostrar préstamos (admin ve todos, usuario solo los suyos)
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // Si es usuario normal, solo ver sus préstamos
    if (req.session.usuario.role !== 'administrador') {
      query.usuarioId = req.session.usuario.id;
    }
    
    const prestamos = await Prestamo.find(query)
      .populate('libroId')
      .populate('usuarioId')
      .sort({ fechaPrestamo: -1 });
    
    res.render('prestamos/lista', { 
      prestamos,
      usuario: req.session.usuario 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar préstamos');
  }
});

// Formulario para crear préstamo (solo admin)
router.get('/nuevo', verificarAdmin, async (req, res) => {
  try {
    const Configuracion = require('../models/modelConfiguracion');
    
    // Obtener libros disponibles (con cantidad disponible o sin el campo pero no agotados)
    const libros = await Libro.find({ 
      agotado: { $ne: true }
    });
    
    // Filtrar libros que tienen disponibilidad
    const librosDisponibles = libros.filter(libro => {
      // Si no tiene cantidadDisponible definida, asumimos que está disponible
      if (libro.cantidadDisponible === undefined || libro.cantidadDisponible === null) {
        return true;
      }
      return libro.cantidadDisponible > 0;
    });
    
    // Obtener usuarios para el select
    const usuarios = await Usuario.find({ activo: true });
    
    // Obtener configuración para calcular fecha sugerida
    let config = await Configuracion.findOne();
    if (!config) {
      config = new Configuracion({ diasMaxPrestamo: 15 });
      await config.save();
    }
    
    // Calcular fecha sugerida
    const fechaSugerida = new Date();
    fechaSugerida.setDate(fechaSugerida.getDate() + config.diasMaxPrestamo);
    const fechaSugeridaStr = fechaSugerida.toISOString().split('T')[0];
    
    res.render('prestamos/crear', { 
      libros: librosDisponibles,
      usuarios,
      fechaSugerida: fechaSugeridaStr,
      diasMaxPrestamo: config.diasMaxPrestamo,
      usuario: req.session.usuario
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar formulario');
  }
});

// Crear préstamo (solo admin)
router.post('/', verificarAdmin, async (req, res) => {
  try {
    const { libroId, usuarioId, fechaDevolucion } = req.body;
    
    // Verificar que el libro tenga cantidad disponible
    const libro = await Libro.findById(libroId);
    if (!libro) {
      return res.send(`
        <script>
          alert('Libro no encontrado');
          window.location.href = '/prestamos/nuevo';
        </script>
      `);
    }
    
    if (libro.cantidadDisponible <= 0 || libro.agotado) {
      return res.send(`
        <script>
          alert('No hay ejemplares disponibles de este libro');
          window.location.href = '/prestamos/nuevo';
        </script>
      `);
    }
    
    // Obtener datos del usuario para el préstamo
    const usuarioPrestamo = await Usuario.findById(usuarioId);
    if (!usuarioPrestamo) {
      return res.send(`
        <script>
          alert('Usuario no encontrado');
          window.location.href = '/prestamos/nuevo';
        </script>
      `);
    }
    
    // Crear el préstamo
    const nuevoPrestamo = new Prestamo({
      libroId,
      usuarioId,
      nombreUsuario: usuarioPrestamo.username,
      fechaDevolucion
    });
    await nuevoPrestamo.save();
    
    // Disminuir cantidad disponible
    await Libro.findByIdAndUpdate(libroId, { 
      $inc: { cantidadDisponible: -1 } 
    });
    
    res.redirect('/prestamos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear préstamo');
  }
});

// Formulario para editar préstamo (solo admin)
router.get('/:id/editar', verificarAdmin, async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('libroId')
      .populate('usuarioId');
    
    if (!prestamo) {
      return res.status(404).send('Préstamo no encontrado');
    }
    
    const libros = await Libro.find();
    const usuarios = await Usuario.find({ activo: true });
    
    res.render('prestamos/editar', { 
      prestamo, 
      libros,
      usuarios,
      usuario: req.session.usuario 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar préstamo');
  }
});

// Actualizar préstamo (solo admin)
router.put('/:id', verificarAdmin, async (req, res) => {
  try {
    const prestamoAnterior = await Prestamo.findById(req.params.id);
    if (!prestamoAnterior) {
      return res.status(404).send('Préstamo no encontrado');
    }
    
    const fueDevuelto = req.body.devuelto === 'true';
    const estabaDevuelto = prestamoAnterior.devuelto;

    // Si se devuelve el libro, aumentar cantidad disponible
    if (!estabaDevuelto && fueDevuelto) {
      await Libro.findByIdAndUpdate(prestamoAnterior.libroId, { 
        $inc: { cantidadDisponible: 1 } 
      });
    }
    
    // Si se marca como no devuelto (raro caso), volver a decrementar
    if (estabaDevuelto && !fueDevuelto) {
      const libro = await Libro.findById(prestamoAnterior.libroId);
      if (libro && libro.cantidadDisponible > 0) {
        await Libro.findByIdAndUpdate(prestamoAnterior.libroId, { 
          $inc: { cantidadDisponible: -1 } 
        });
      }
    }
    
    const updateData = {
      fechaDevolucion: req.body.fechaDevolucion,
      devuelto: fueDevuelto
    };
    
    if (fueDevuelto && !estabaDevuelto) {
      updateData.fechaDevolucionReal = new Date();
    }
    
    await Prestamo.findByIdAndUpdate(req.params.id, updateData);
    
    res.redirect('/prestamos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar préstamo');
  }
});

// Eliminar préstamo (solo admin)
router.delete('/:id', verificarAdmin, async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id);
    if (!prestamo) {
      return res.status(404).send('Préstamo no encontrado');
    }
    
    // Si el préstamo no estaba devuelto, restaurar cantidad disponible
    if (!prestamo.devuelto) {
      await Libro.findByIdAndUpdate(prestamo.libroId, { 
        $inc: { cantidadDisponible: 1 } 
      });
    }
    
    await Prestamo.findByIdAndDelete(req.params.id);
    res.redirect('/prestamos');
  } catch (error) {
    console.error(error);
    res.send(`
      <script>
        alert('Error al eliminar préstamo');
        window.location.href = '/prestamos';
      </script>
    `);
  }
});

module.exports = router;