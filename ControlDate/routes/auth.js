const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');
const router = express.Router();

// Registro de usuário
router.post('/register', async (req, res) => {
    const { nome, email, senha, cpf } = req.body;

    try {
        const pool = await poolPromise;

        // Verificar se o email já existe
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email'); // Alterei para 'USUARIO' conforme padrão

        if (result.recordset.length > 0) {
            return res.status(400).json({ msg: 'Email já cadastrado.' });
        }

        // Hash da senha
        const hashedSenha = await bcrypt.hash(senha, 10); // Corrigi o nome da variável para hashedSenha

        // Inserir o novo usuário no banco de dados
        await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('email', sql.NVarChar, email)
            .input('senha', sql.NVarChar, hashedSenha)
            .input('cpf', sql.NVarChar, cpf)
            .query('INSERT INTO USUARIO (name, email, senha, cpf) VALUES (@nome, @email, @senha, @cpf)');

        return res.status(201).json({ msg: 'Usuário registrado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Login de usuário
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const pool = await poolPromise;

        // Verificar se o usuário existe
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ msg: 'Email ou senha inválidos.' });
        }

        const user = result.recordset[0];

        // Verificar a senha
        const validPassword = await bcrypt.compare(senha, user.senha); // Alterei 'password' para 'senha'
        if (!validPassword) {
            return res.status(400).json({ msg: 'Email ou senha inválidos.' });
        }

        // Gerar o token JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '20000d' });

        return res.json({ token });
    } catch (error) {
        return res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;
