require('dotenv').config(); // 1. Cargar secretos (Variable de entorno)
const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const multer = require('multer');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();
const PORT = process.env.PORT || 3000;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ==========================================
// 🛡️ CAPA 2: ANTI-FUERZA BRUTA (RATE LIMIT)
// ==========================================
// Limita a 50 peticiones cada 15 min por IP para evitar saturación
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Demasiadas solicitudes. Tu IP ha sido limitada temporalmente."
});
//app.use(globalLimiter);

// ==========================================
// CONFIGURACIÓN MULTER (Tu código original)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${req.params.estancia}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// ==========================================
// IMPORTACIONES Y CONFIGURACIÓN BÁSICA
// ==========================================
const estanciasConfig = require('./config/estancias');
const dashboardTutorRoutes = require('./routes/dashboard_tutor');
const dashboardMaestrosRoutes = require('./routes/dashboard_maestros');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================================
// 🛡️ CAPA 3: LIMPIEZA DE DATOS (NO-SQL INJECTION)
// ==========================================
// Elimina símbolos como '$' o '.' en el body para evitar hackeos a Mongo
app.use(mongoSanitize());

// ==========================================
// 🛡️ CAPA 4: SESIONES ROBUSTAS (EN BASE DE DATOS)
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secreto_local',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
        mongoUrl: `${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017'}/db_sesiones_globales`,
        ttl: 24 * 60 * 60, // 1 día
        autoRemove: 'native'
    }),
    cookie: {
        secure: IS_PRODUCTION,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// ==========================================
// DEFINICIÓN DEL ROUTER PRINCIPAL
// ==========================================
const routerPrincipal = express.Router({ mergeParams: true });

// --- MIDDLEWARES DEL ROUTER ---

// A) Validación de Estancia
routerPrincipal.use((req, res, next) => {
    const nombreEstancia = req.params.estancia;
    if (!estanciasConfig[nombreEstancia]) {
        console.error(`❌ Intento de acceso a estancia inexistente: ${nombreEstancia}`);
        return res.status(404).render('error/error_estancia', {
            title: 'Error 404',
            estanciaErronea: nombreEstancia
        });
    }
    res.locals.estanciaActual = nombreEstancia;
    res.locals.baseUrl = `/${nombreEstancia}`;
    res.locals.user = req.session.user || null;
    next();
});

// B) Cargar Configuración JSON
const cargarConfiguracion = (req, res, next) => {
    const estancia = req.params.estancia;
    const rutaArchivo = path.join(__dirname, 'data', `${estancia}.json`);
    const defaultConfig = { themeColor: 'blue', notifications: true };

    if (fs.existsSync(rutaArchivo)) {
        try {
            const data = fs.readFileSync(rutaArchivo, 'utf8');
            res.locals.config = JSON.parse(data);
        } catch (error) {
            console.error("Error leyendo JSON:", error);
            res.locals.config = defaultConfig;
        }
    } else {
        res.locals.config = defaultConfig;
    }
    next();
};
routerPrincipal.use(cargarConfiguracion);


// ==========================================
// RUTAS DE VISTAS
// ==========================================
routerPrincipal.use('/dashboard/maestro', dashboardMaestrosRoutes);
routerPrincipal.use('/dashboard/tutor', dashboardTutorRoutes);
routerPrincipal.use('/auth/login', loginRoutes);
routerPrincipal.use('/auth/register', registerRoutes);

// 🛡️ Rate Limit específico para Login (Más estricto: 5 intentos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Muchos intentos de login. Espera 15 min."
});


// ==========================================
// APLICACIÓN DE RUTAS AL APP
// ==========================================

app.get('/', (req, res) => {
    res.render('error/welcome', { title: 'Inicio - Gestor Documental' });
});

// Conectar router principal
app.use('/:estancia', routerPrincipal);



routerPrincipal.get('/', (req, res) => {
    res.render('estancia/estancia', {
        title: `Bienvenido a ${req.params.estancia}`,
        estancia: req.params.estancia
    });
});


// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`\n${green}🛡️  SERVIDOR SEGURO ACTIVO${reset}`);
    console.log(`🔒 Seguridad: Helmet, MongoStore, RateLimit, Sanitize`);
    console.log(`🌐 URL: http://localhost:${PORT}\n`);
    console.log(`   Red:   http://ip:${PORT}`);
});