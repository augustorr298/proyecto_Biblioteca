
const express = require('express');
const router = express.Router();
const Libro = require('../models/modelLibro');
const Prestamo = require('../models/modelPrestamo');

// Mostrar todos los libros
router.get('/', async (req, res) => {
  try {
    const libros = await Libro.find().sort({ fechaRegistro: -1 });
    res.render('libros/lista', { libros });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar libros');
  }
});

// Formulario para agregar libro
router.get('/nuevo', (req, res) => {
  res.render('libros/crear');
});

// Crear libro
router.post('/', async (req, res) => {
  try {
    const nuevoLibro = new Libro(req.body);
    await nuevoLibro.save();
    res.redirect('/libros');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear libro');
  }
});

// Formulario para editar libro
router.get('/:id/editar', async (req, res) => {
  try {
    const libro = await Libro.findById(req.params.id);
    res.render('libros/editar', { libro });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar libro');
  }
});

// Actualizar libro
router.put('/:id', async (req, res) => {
  try {
    // Convertir checkbox correctamente
    req.body.disponible = req.body.disponible === 'true';
    
    await Libro.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/libros');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar libro');
  }
});

// Eliminar libro
router.delete('/:id', async (req, res) => {
  try {
    // Verificar si tiene préstamos activos
    const prestamosActivos = await Prestamo.findOne({ 
      libroId: req.params.id, 
      devuelto: false 
    });
    
    if (prestamosActivos) {
      // Redirigir con mensaje de error
      return res.send(`
        <script>
          alert('No se puede eliminar: el libro tiene préstamos activos');
          window.location.href = '/libros';
        </script>
      `);
    }
    
    await Libro.findByIdAndDelete(req.params.id);
    res.redirect('/libros');
  } catch (error) {
    console.error(error);
    res.send(`
      <script>
        alert('Error al eliminar libro');
        window.location.href = '/libros';
      </script>
    `);
  }
});

module.exports = router;