const express = require('express');
const router = express.Router();
const Libro = require('../models/modelLibro');
const Prestamo = require('../models/modelPrestamo');
const { verificarAdmin } = require('../middlewares/auth');
const { subirImagenLibro } = require('../middlewares/subirArchivos');

// Mostrar todos los libros (usuarios ven solo disponibles, admins ven todos)
router.get('/', async (req, res) => {
  try {
    const { buscar } = req.query;
    let query = {};
    
    // Si hay búsqueda por nombre
    if (buscar) {
      query.titulo = { $regex: buscar, $options: 'i' };
    }
    
    // Si es usuario normal, solo mostrar libros no agotados
    if (req.session.usuario.role !== 'administrador') {
      // Mostrar libros que no están agotados (incluyendo los que no tienen el campo)
      query.agotado = { $ne: true };
    }
    
    const libros = await Libro.find(query).sort({ fechaRegistro: -1 });
    res.render('libros/lista', { 
      libros, 
      buscar: buscar || '',
      usuario: req.session.usuario 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar libros');
  }
});

// Formulario para agregar libro (solo admin)
router.get('/nuevo', verificarAdmin, (req, res) => {
  res.render('libros/crear', { usuario: req.session.usuario });
});

// Crear libro (solo admin)
router.post('/', verificarAdmin, (req, res) => {
  subirImagenLibro(req, res, async function(err) {
    try {
      if (err) {
        console.error('Error al subir imagen:', err);
      }
      
      const { titulo, autor, genero, anio, cantidadTotal } = req.body;
      
      const nuevoLibro = new Libro({
        titulo,
        autor,
        genero,
        anio,
        cantidadTotal: parseInt(cantidadTotal) || 1,
        cantidadDisponible: parseInt(cantidadTotal) || 1,
        agotado: false,
        imagen: req.file ? '/uploads/libros/' + req.file.filename : null
      });
      
      await nuevoLibro.save();
      res.redirect('/libros');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al crear libro');
    }
  });
});

// Formulario para editar libro (solo admin)
router.get('/:id/editar', verificarAdmin, async (req, res) => {
  try {
    const libro = await Libro.findById(req.params.id);
    if (!libro) {
      return res.status(404).send('Libro no encontrado');
    }
    res.render('libros/editar', { libro, usuario: req.session.usuario });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar libro');
  }
});

// Actualizar libro (solo admin) - NO se modifica el estado de prestado
router.put('/:id', verificarAdmin, (req, res) => {
  subirImagenLibro(req, res, async function(err) {
    try {
      if (err) {
        console.error('Error al subir imagen:', err);
      }
      
      const libro = await Libro.findById(req.params.id);
      if (!libro) {
        return res.status(404).send('Libro no encontrado');
      }
      
      const { titulo, autor, genero, anio, cantidadTotal } = req.body;
      
      // Calcular la diferencia en cantidad total para ajustar disponible
      const diferenciaCantidad = parseInt(cantidadTotal) - libro.cantidadTotal;
      const nuevaCantidadDisponible = Math.max(0, libro.cantidadDisponible + diferenciaCantidad);
      
      const updateData = {
        titulo,
        autor,
        genero,
        anio,
        cantidadTotal: parseInt(cantidadTotal),
        cantidadDisponible: nuevaCantidadDisponible
      };
      
      // Si se sube nueva imagen, actualizarla
      if (req.file) {
        updateData.imagen = '/uploads/libros/' + req.file.filename;
      }
      
      await Libro.findByIdAndUpdate(req.params.id, updateData);
      res.redirect('/libros');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al actualizar libro');
    }
  });
});

// "Eliminar" libro - solo marca como agotado (solo admin)
router.delete('/:id', verificarAdmin, async (req, res) => {
  try {
    // Verificar si tiene préstamos activos
    const prestamosActivos = await Prestamo.findOne({ 
      libroId: req.params.id, 
      devuelto: false 
    });
    
    if (prestamosActivos) {
      return res.send(`
        <script>
          alert('No se puede marcar como agotado: el libro tiene préstamos activos');
          window.location.href = '/libros';
        </script>
      `);
    }
    
    // Marcar como agotado en lugar de eliminar
    await Libro.findByIdAndUpdate(req.params.id, { 
      agotado: true,
      cantidadDisponible: 0 
    });
    
    res.redirect('/libros');
  } catch (error) {
    console.error(error);
    res.send(`
      <script>
        alert('Error al marcar libro como agotado');
        window.location.href = '/libros';
      </script>
    `);
  }
});

// Reactivar libro (solo admin)
router.post('/:id/reactivar', verificarAdmin, async (req, res) => {
  try {
    const libro = await Libro.findById(req.params.id);
    if (!libro) {
      return res.status(404).send('Libro no encontrado');
    }
    
    await Libro.findByIdAndUpdate(req.params.id, { 
      agotado: false,
      cantidadDisponible: libro.cantidadTotal
    });
    
    res.redirect('/libros');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al reactivar libro');
  }
});

module.exports = router;