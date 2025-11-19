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
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

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
  secret: process.env.SECRET_SESSION || 'secreto_super_seguro',
  name: 'auth_cookie',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 60 * 1000
  }
}));

// USUARIOS
const usuarios = [
  { id: 1, username: "admin", password: "admin123", role: "administrador" },
  { id: 2, username: "usuario", password: "user123", role: "normal" }
];

// MIDDLEWARES DE AUTH
const verificarSesion = (req, res, next) => {
  if (req.session.usuario) {
    next();
  } else {
    res.redirect("/");
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.session.usuario && req.session.usuario.role === "administrador") {
    next();
  } else {
    res.status(403).send("❌ Acceso denegado: Solo administradores");
  }
};

const verificarUsuarioNormal = (req, res, next) => {
  if (req.session.usuario) {
    next();
  } else {
    res.redirect("/");
  }
};

// RUTAS PÚBLICAS
app.get('/', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/dashboard');
  }
  res.render('home', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const usuario = usuarios.find(u => u.username === username && u.password === password);
  
  if (usuario) {
    req.session.usuario = { id: usuario.id, username: usuario.username, role: usuario.role };
    res.redirect('/dashboard');
  } else {
    res.render('home', { error: "Usuario o contraseña incorrectos" });
  }
});

app.get('/dashboard', verificarSesion, (req, res) => {
  res.render('dashboard', { usuario: req.session.usuario });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('auth_cookie');
  res.redirect('/');
});

// TUS RUTAS (PROTEGIDAS AHORA)
const librosRouter = require('./router/routerLibros');
const prestamosRouter = require('./router/routerPrestamos');

app.use('/libros', verificarUsuarioNormal, librosRouter);
app.use('/prestamos', verificarUsuarioNormal, prestamosRouter);

// RUTAS ADMIN CON DATOS REALES
app.get('/admin/usuarios', verificarAdmin, (req, res) => {
  res.render('admin/usuarios', { 
    usuario: req.session.usuario,
    usuarios: usuarios
  });
});

app.get('/admin/reportes', verificarAdmin, async (req, res) => {
  try {
    const Libro = require('./models/modelLibro');
    const Prestamo = require('./models/modelPrestamo');
    
    const totalLibros = await Libro.countDocuments();
    const totalPrestamos = await Prestamo.countDocuments();
    const prestamosActivos = await Prestamo.countDocuments({ devuelto: false });
    const librosDisponibles = await Libro.countDocuments({ disponible: true });
    
    res.render('admin/reportes', { 
      usuario: req.session.usuario,
      stats: {
        totalLibros: totalLibros || 0,
        totalPrestamos: totalPrestamos || 0,
        prestamosActivos: prestamosActivos || 0,
        librosDisponibles: librosDisponibles || 0,
        totalUsuarios: usuarios.length
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
        totalUsuarios: usuarios.length
      }
    });
  }
});

app.get('/admin/configuracion', verificarAdmin, async (req, res) => {
  try {
    const Configuracion = require('./models/modelConfiguracion');
    let config = await Configuracion.findOne();
    
    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = new Configuracion({ diasMaxPrestamo: 15 });
      await config.save();
    }
    
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
    
    console.log(`✅ Configuración actualizada: Días máximos de préstamo = ${diasMaxPrestamo}`);
    res.redirect('/admin/configuracion');
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.redirect('/admin/configuracion');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});