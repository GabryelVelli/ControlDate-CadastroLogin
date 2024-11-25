const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db'); // Conexão com o banco de dados já configurada
const router = express.Router();

// Registro de usuário
router.post('/register', async (req, res) => {
    const { nome, email, senha, cpf } = req.body;

    try {
        const pool = await poolPromise;

        // Verificar se o email já existe
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');

        if (result.recordset.length > 0) {
            return res.status(400).json({ msg: 'Email já cadastrado.' });
        }

        // Hash da senha
        const hashedSenha = await bcrypt.hash(senha, 10);

        // Inserir o novo usuário no banco de dados
        await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('email', sql.NVarChar, email)
            .input('senha', sql.NVarChar, hashedSenha)
            .input('cpf', sql.NVarChar, cpf)
            .query('INSERT INTO USUARIO (nome, email, senha, cpf) VALUES (@nome, @email, @senha, @cpf)');

        return res.status(201).json({ msg: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error(error);
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
        const validPassword = await bcrypt.compare(senha, user.senha);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Email ou senha inválidos.' });
        }

        // Gerar o token JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' }); // Token válido por 1 dia

        return res.json({ token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Adicionar uma empresa

router.post('/add-empresa', verifyToken, async (req, res) => {
    const { nomeEmpresa, cnpj, contato, logradouro, numero, bairro, cidade, cep } = req.body;

    try {
        const pool = await poolPromise;
        const idusuario = req.userId; // Obtém o id do usuário a partir do token

        // Verificar se a empresa já existe com o mesmo CNPJ
        const empresaResult = await pool.request()
            .input('cnpj', sql.NVarChar, cnpj)
            .query('SELECT * FROM EMPRESA WHERE CNPJ = @cnpj');

        if (empresaResult.recordset.length > 0) {
            return res.status(400).send('Empresa com este CNPJ já cadastrada');
        }

        // Inserir a nova empresa no banco de dados e associá-la ao idusuario
        const empresaInsert = await pool.request()
            .input('nomeEmpresa', sql.NVarChar, nomeEmpresa)
            .input('cnpj', sql.NVarChar, cnpj)
            .input('contato', sql.NVarChar, contato)
            .input('idusuario', sql.Int, idusuario) // Certifique-se de que o idusuario está sendo passado corretamente
            .query('INSERT INTO EMPRESA (nome, CNPJ, contato, idusuario) VALUES (@nomeEmpresa, @cnpj, @contato, @idusuario); SELECT SCOPE_IDENTITY() AS id');

        const idEmpresa = empresaInsert.recordset[0].id;

        // Inserir a unidade da empresa no banco de dados
        await pool.request()
            .input('idEmpresa', sql.Int, idEmpresa)
            .input('logradouro', sql.NVarChar, logradouro)
            .input('numero', sql.NVarChar, numero) // Verifique se você está usando o tipo correto
            .input('bairro', sql.NVarChar, bairro)
            .input('cidade', sql.NVarChar, cidade)
            .input('cep', sql.NVarChar, cep)
            .query('INSERT INTO Unidade (idempresa, logradouro, numero, bairro, cidade, CEP) VALUES (@idEmpresa, @logradouro, @numero, @bairro, @cidade, @cep)');

        res.status(201).send('Empresa e unidade cadastradas com sucesso');
    } catch (err) {
        console.error('Erro ao cadastrar empresa e unidade:', err.message);
        res.status(500).send('Erro ao cadastrar empresa e unidade');
    }
});

//testes 
router.post('/add-produto', verifyToken, async (req, res) => {
    const { nome, codigoBarras, vencimento, quantidade, fornecedor, categoria } = req.body;

    try {
        const pool = await poolPromise;
        const idusuario = req.userId; // Obtém o id do usuário a partir do token

        // Verificar se o produto já existe com o mesmo código de barras
        const produtoResult = await pool.request()
            .input('codigoBarras', sql.BigInt, codigoBarras)
            .query('SELECT * FROM Produto WHERE codigoBarras = @codigoBarras');

        if (produtoResult.recordset.length > 0) {
            return res.status(400).send('Produto com este código de barras já cadastrado');
        }

        // Inserir o novo produto no banco de dados e associá-lo ao idusuario
        const produtoInsert = await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('codigoBarras', sql.BigInt, codigoBarras)
            .input('vencimento', sql.Date, vencimento)
            .input('quantidade', sql.Int, quantidade)
            .input('categoria', sql.VarChar, categoria)
            .input('fornecedor', sql.NVarChar, fornecedor)
            .input('idusuario', sql.Int, idusuario) // Certifique-se de que o idusuario está sendo passado corretamente
            .query('INSERT INTO Produto (nome, codigoBarras, vencimento, quantidade, fornecedor,categoria, idusuario) VALUES (@nome, @codigoBarras, @vencimento, @quantidade, @fornecedor, @categoria, @idusuario); SELECT SCOPE_IDENTITY() AS id');

        res.status(201).send('Produto adicionado com sucesso');
    } catch (err) {
        console.error('Erro ao cadastrar produto:', err.message);
        res.status(500).send('Erro ao cadastrar produto');
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
module.exports = router;
