const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTenantModel } = require('../utils/dbHandler');



// ==========================================
// RUTAS
// ==========================================

router.get('/', (req, res) => {

    const ahora = new Date();


    const opcionesFecha = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Mexico_City'
    };


    const horaActual = ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // Para que salga AM/PM
        timeZone: 'America/Mexico_City'
    });


    const horaMexico = parseInt(ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'America/Mexico_City'
    }));

    const esDeNoche = horaMexico >= 19 || horaMexico < 6;

    res.render('dashboard/dashboard_tutor', {
        titulo: 'EduSmart',
        fechaHoy: ahora.toLocaleDateString('es-ES', opcionesFecha),
        horaActual: horaActual,
        esDeNoche: esDeNoche,
        mensaje: esDeNoche ? 'Buenas noches' : 'Buenos días'
    });
});



module.exports = router;