require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/biblioteca';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    
  })
  .catch(err => console.error('Error conectando a MongoDB:', err));


// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// SESIONES
app.use(session({
  secret: process.env.SECRET_SESSION || 'secreto_super_seguro_biblioteca',
  name: 'biblioteca_session',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 60 * 60 * 1000 // 1 hora
  }
}));

// Middleware para pasar usuario a todas las vistas
const { pasarUsuario, verificarSesion, verificarAdmin } = require('./middlewares/auth');
app.use(pasarUsuario);

// RUTAS DE AUTENTICACIÓN
const authRouter = require('./router/routerAuth');
app.use('/', authRouter);

// Página de inicio
app.get('/', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null, success: null });
});

//dashboard
app.get('/dashboard', verificarSesion, (req, res) => {
  res.render('dashboard', { usuario: req.session.usuario });
});

// RUTAS DE LIBROS Y PRÉSTAMOS (protegidas)
const librosRouter = require('./router/routerLibros');
const prestamosRouter = require('./router/routerPrestamos');

app.use('/libros', verificarSesion, librosRouter);
app.use('/prestamos', verificarSesion, prestamosRouter);

// RUTAS DE ADMINISTRACIÓN
const usuariosRouter = require('./router/routerUsuarios');
app.use('/admin/usuarios', usuariosRouter);

// REPORTES (solo admin)
app.get('/admin/reportes', verificarAdmin, async (req, res) => {
  try {
    const Libro = require('./models/modelLibro');
    const Prestamo = require('./models/modelPrestamo');
    const Usuario = require('./models/modelUsuario');
    
    const totalLibros = await Libro.countDocuments({ agotado: false });
    const totalPrestamos = await Prestamo.countDocuments();
    const prestamosActivos = await Prestamo.countDocuments({ devuelto: false });
    const librosDisponibles = await Libro.countDocuments({ 
      cantidadDisponible: { $gt: 0 },
      agotado: false 
    });
    const totalUsuarios = await Usuario.countDocuments({ activo: true });
    
    res.render('admin/reportes', { 
      usuario: req.session.usuario,
      stats: {
        totalLibros,
        totalPrestamos,
        prestamosActivos,
        librosDisponibles,
        totalUsuarios
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.render('admin/reportes', { 
      usuario: req.session.usuario,
      stats: {
        totalLibros: 0,
        totalPrestamos: 0,
        prestamosActivos: 0,
        librosDisponibles: 0,
        totalUsuarios: 0
      }
    });
  }
});

//config (solo admin)
app.get('/admin/configuracion', verificarAdmin, async (req, res) => {
  try {
    const Configuracion = require('./models/modelConfiguracion');
    let config = await Configuracion.findOne();
    
    res.render('admin/configuracion', { 
      usuario: req.session.usuario,
      diasMaxPrestamo: config.diasMaxPrestamo
    });
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    res.render('admin/configuracion', { 
      usuario: req.session.usuario,
      diasMaxPrestamo: 15
    });
  }
});

app.post('/admin/configuracion', verificarAdmin, async (req, res) => {
  try {
    const Configuracion = require('./models/modelConfiguracion');
    const { diasMaxPrestamo } = req.body;
    
    let config = await Configuracion.findOne();
    
    if (config) {
      config.diasMaxPrestamo = diasMaxPrestamo;
      await config.save();
    } else {
      config = new Configuracion({ diasMaxPrestamo });
      await config.save();
    }
    
    console.log(`Configuración actualizada: Días máximos de préstamo = ${diasMaxPrestamo}`);
    res.redirect('/admin/configuracion');
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.redirect('/admin/configuracion');
  }
});

// Vista de error
app.get('/error', (req, res) => {
  res.render('error', { mensaje: 'Ha ocurrido un error', usuario: req.session.usuario });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});