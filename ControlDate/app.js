const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./config/db'); // Conexão com o banco de dados

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

// Inicializar o app Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para ler JSON
app.use(express.json());
app.use(express.static('public'));

// Rota principal de teste
app.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT 1 AS number');
        res.send(result.recordset);
    } catch (err) {
        res.status(500).send('Erro na conexão com o banco de dados');
        console.error(err);
    }
});

// Rota de Cadastro (Registro)
app.post('/register', async (req, res) => {
    const { nome, email, senha, cpf } = req.body;
    try {
        const pool = await poolPromise;
        
        // Verificar se o usuário já existe
        const userResult = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');
        
        if (userResult.recordset.length > 0) {
            return res.status(400).send('Usuário já existe');
        }

        // Hash da senha
        const hashedSenha = await bcrypt.hash(senha, 10);

        // Inserir novo usuário no banco de dados
        await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('email', sql.NVarChar, email)
            .input('senha', sql.NVarChar, hashedSenha)
            .input('cpf', sql.VarChar, cpf)
            .query('INSERT INTO USUARIO (nome, email, senha, cpf, created_at) VALUES (@nome, @email, @senha, @cpf, GETDATE())');

        res.status(201).send('Usuário cadastrado com sucesso');
    } catch (err) {
        res.status(500).send('Erro ao registrar o usuário');
        console.error(err);
    }
});

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const pool = await poolPromise;

        // Verificar se o usuário existe
        const userResult = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');

        if (userResult.recordset.length === 0) {
            return res.status(400).send('Usuário não encontrado');
        }

        const user = userResult.recordset[0];

        // Comparar as senhas
        const isMatch = await bcrypt.compare(senha, user.senha);

        if (!isMatch) {
            return res.status(400).send('Senha incorreta');
        }

        // Gerar token JWT
        const token = jwt.sign(
            { id: user.IDusuario, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // Token válido por 30 dias
        );

        res.status(200).json({ token });
    } catch (err) {
        res.status(500).send('Erro ao fazer login');
        console.error(err);
    }
});

// Middleware para verificar o token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
  
    if (!token) return res.status(403).send('Token não fornecido.');

    const bearerToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Erro na verificação do token:', err.message);
            return res.status(500).send('Falha na autenticação do token.');
        }

        req.userId = decoded.id; // Salva o id do usuário decifrado na requisição
        next(); // Chama a próxima função de middleware
    });
};

// Rota protegida (dashboard)
app.get('/protected-route', verifyToken, (req, res) => {
    res.send('Esta é uma rota protegida, você está autenticado!');
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
