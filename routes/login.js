const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTenantModel } = require('../utils/dbHandler');

// Ruta principal: GET /
router.get('/', (req, res) => {

    res.render('auth/login', {
        titulo: 'Mi Proyecto Node',
        mensaje: '¡Bienvenido a tu servidor Express!'
    });
});



module.exports = router;