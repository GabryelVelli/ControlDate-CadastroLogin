const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // Se estiver usando o Azure ou conexões seguras
        trustServerCertificate: true // Usado em servidores locais
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Conectado ao SQL Server');
        return pool;
    })
    .catch(err => console.error('Falha na conexão com o banco de dados', err));

module.exports = {
    sql, poolPromise
};