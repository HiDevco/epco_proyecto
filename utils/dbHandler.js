const mongoose = require('mongoose');


let connections = {};

const getTenantModel = async (estanciaName, modelName) => {
    if (!estanciaName) throw new Error("No se proporcionó el nombre de la estancia");
    if (!modelName) throw new Error("No se proporcionó el nombre del modelo (ej. 'User')");

    const dbName = `db_${estanciaName.replace(/[^a-zA-Z0-9]/g, '')}`;
    let conn = connections[dbName];

    if (!conn) {
        conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        }).asPromise();
        connections[dbName] = conn;
    }

    let schema;

};

module.exports = { getTenantModel };