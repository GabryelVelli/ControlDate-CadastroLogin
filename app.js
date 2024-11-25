const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./config/db'); // Conexão com o banco de dados

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));


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

        req.userId = decoded.id; // Certifique-se de que o id está correto
        next();
    });
};
//rota cadastro
app.post('/register', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    try {
        const pool = await poolPromise;

        // Verificar se o email já está cadastrado
        const existingUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Email já cadastrado.' });
        }

        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Inserir novo usuário
        await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('cpf', sql.NVarChar, cpf)
            .input('email', sql.NVarChar, email)
            .input('senha', sql.NVarChar, hashedPassword)
            .query('INSERT INTO USUARIO (nome, cpf, email, senha) VALUES (@nome, @cpf, @email, @senha)');

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error.message);
        res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
    }
});
// Rota de Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM USUARIO WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ msg: 'Email ou senha inválidos.' });
        }

        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(senha, user.senha);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Email ou senha inválidos.' });
        }

        // Gera o token com o ID do usuário
        const token = jwt.sign({ id: user.IDusuario }, process.env.JWT_SECRET, { expiresIn: '30d' });
        console.log('Token gerado:', token); // Log para verificar o token

        return res.json({ token });
    } catch (error) {
        console.error('Erro no login:', error.message);
        return res.status(500).json({ error: 'Erro no servidor' });
    }
});
        app.post('/add-empresa', verifyToken, async (req, res) => {
            const { nomeEmpresa, cnpj, contato, logradouro, numero, bairro, cidade, cep } = req.body;

            try {
                const pool = await poolPromise;
                const idusuario = req.userId; // Obtendo o ID do usuário do token

                console.log('ID do usuário:', idusuario); // Para depuração

                const empresaResult = await pool.request()
                    .input('cnpj', sql.NVarChar, cnpj)
                    .query('SELECT * FROM EMPRESA WHERE CNPJ = @cnpj');

                if (empresaResult.recordset.length > 0) {
                    return res.status(400).send('Empresa com este CNPJ já cadastrada');
                }

                const empresaInsert = await pool.request()
                    .input('nomeEmpresa', sql.NVarChar, nomeEmpresa)
                    .input('cnpj', sql.NVarChar, cnpj)
                    .input('contato', sql.NVarChar, contato)
                    .input('idusuario', sql.Int, idusuario) // Aqui você está passando o ID do usuário
                    .query('INSERT INTO EMPRESA (nome, CNPJ, contato, idusuario) VALUES (@nomeEmpresa, @cnpj, @contato, @idusuario); SELECT SCOPE_IDENTITY() AS id');

                const idEmpresa = empresaInsert.recordset[0].id;

                await pool.request()
                    .input('idEmpresa', sql.Int, idEmpresa)
                    .input('logradouro', sql.NVarChar, logradouro)
                    .input('numero', sql.NVarChar, numero)
                    .input('bairro', sql.NVarChar, bairro)
                    .input('cidade', sql.NVarChar, cidade)
                    .input('cep', sql.NVarChar, cep)
                    .query('INSERT INTO Unidade (idempresa, logradouro, numero, bairro, cidade, cep) VALUES (@idEmpresa, @logradouro, @numero, @bairro, @cidade, @cep)');

                res.status(201).send('Empresa e unidade cadastradas com sucesso');
            } catch (err) {
                console.error('Erro ao cadastrar empresa e unidade:', err.message);
                res.status(500).send('Erro ao cadastrar empresa e unidade');
            }
        });

        app.get('/empresas', verifyToken, async (req, res) => {
            
            try {
                const pool = await poolPromise;
                const idusuario = req.userId; // Obtém o ID do usuário a partir do token
        
                // Consulta para obter todas as empresas cadastradas pelo usuário
                const result = await pool.request()
                    .input('idusuario', sql.Int, idusuario)
                    .query('SELECT * FROM EMPRESA WHERE idusuario = @idusuario');
        
                // Retorna os dados para o frontend
                res.json(result.recordset);
            } catch (error) {
                console.error('Erro ao buscar empresas:', error.message);
                res.status(500).send('Erro ao buscar empresas.');
            }
        });

            //testes testes testes teste teste//
         
            app.post('/add-produto', verifyToken, async (req, res) => {
                const {nome, codigoBarras, vencimento, quantidade, fornecedor, categoria} = req.body;
            
                try {
                    const pool = await poolPromise;
                    const idusuario = req.userId; // Obtendo o ID do usuário do token
            
                    console.log('ID do usuário:', idusuario); // Para depuração
            
                    // Verificar se já existe um produto com o mesmo código de barras
                    const produtoResult = await pool.request()
                        .input('codigoBarras', sql.BigInt, codigoBarras)
                        .query('SELECT * FROM Produto WHERE codigoBarras = @codigoBarras');
            
                    if (produtoResult.recordset.length > 0) {
                        return res.status(400).send('Produto com este código de barras já cadastrado');
                    }
            
                    // Inserir o produto na tabela Produto
                    const produtoInsert = await pool.request()
                        .input('nome', sql.NVarChar, nome)
                        .input('codigoBarras', sql.BigInt, codigoBarras)
                        .input('vencimento', sql.Date, vencimento)
                        .input('quantidade', sql.Int, quantidade)
                        .input('fornecedor', sql.NVarChar, fornecedor)
                        .input('idusuario', sql.Int, idusuario) // ID do usuário autenticado
                        .input('categoria', sql.VarChar, categoria)
                        .query('INSERT INTO Produto (nome, codigoBarras, vencimento, quantidade, fornecedor,categoria, idusuario) VALUES (@nome, @codigoBarras, @vencimento, @quantidade, @fornecedor, @categoria, @idusuario); SELECT SCOPE_IDENTITY() AS id');
        
                    res.status(201).send('Produto adicionado com sucesso');
                } catch (err) {
                    console.error('Erro ao cadastrar produto:', err.message);
                    res.status(500).send('Erro ao cadastrar produto');
                }
            });

            //testes testes testes teste teste//
            //testes testes testes teste teste//
            app.get('/produtos', verifyToken, async (req, res) => {
            
                try {
                    const pool = await poolPromise;
                    const idusuario = req.userId; // Obtém o ID do usuário a partir do token
            
                    // Consulta para obter todas as empresas cadastradas pelo usuário
                    const result = await pool.request()
                        .input('idusuario', sql.Int, idusuario)
                        .query('SELECT * FROM PRODUTOS WHERE idusuario = @idusuario');
            
                    // Retorna os dados para o frontend
                    res.json(result.recordset);
                } catch (error) {
                    console.error('Erro ao buscar Produtos:', error.message);
                    res.status(500).send('Erro ao buscar Produtos.');
                }
            });
            
// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
