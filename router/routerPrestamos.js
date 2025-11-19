const express = require('express');
const router = express.Router();
const Prestamo = require('../models/modelPrestamo');
const Libro = require('../models/modelLibro');

// Mostrar todos los préstamos
router.get('/', async (req, res) => {
  try {
    const prestamos = await Prestamo.find().populate('libroId').sort({ fechaPrestamo: -1 });
    res.render('prestamos/lista', { prestamos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar préstamos');
  }
});

// Formulario para crear préstamo
router.get('/nuevo', async (req, res) => {
  try {
    const Configuracion = require('../models/modelConfiguracion');
    const libros = await Libro.find({ disponible: true });
    
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
      libros,
      fechaSugerida: fechaSugeridaStr,
      diasMaxPrestamo: config.diasMaxPrestamo
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar formulario');
  }
});

// Crear préstamo
router.post('/', async (req, res) => {
  try {
    const nuevoPrestamo = new Prestamo(req.body);
    await nuevoPrestamo.save();
    
    // Marcar libro como no disponible
    await Libro.findByIdAndUpdate(req.body.libroId, { disponible: false });
    
    res.redirect('/prestamos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear préstamo');
  }
});

// Formulario para editar préstamo
router.get('/:id/editar', async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id).populate('libroId');
    const libros = await Libro.find();
    res.render('prestamos/editar', { prestamo, libros });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar préstamo');
  }
});

// Actualizar préstamo
router.put('/:id', async (req, res) => {
  try {
    const prestamoAnterior = await Prestamo.findById(req.params.id);
    
    //validar cambios en estado de devolución
    const fueDevuelto = req.body.devuelto === 'true';
    const estabaDevuelto = prestamoAnterior.devuelto;

    //después de devuelto, ya está disponible
    if (!estabaDevuelto && fueDevuelto) {
      await Libro.findByIdAndUpdate(prestamoAnterior.libroId, { disponible: true });
    }
    
    //si se marca como no devuelto, volver a marcar no disponible
    if (estabaDevuelto && !fueDevuelto) {
      await Libro.findByIdAndUpdate(prestamoAnterior.libroId, { disponible: false });
    }
    
    req.body.devuelto = fueDevuelto;
    await Prestamo.findByIdAndUpdate(req.params.id, req.body);
    
    res.redirect('/prestamos');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar préstamo');
  }
});

// Eliminar préstamo
router.delete('/:id', async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id);
    await Libro.findByIdAndUpdate(prestamo.libroId, { disponible: true });
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