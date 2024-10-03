const container = document.getElementById('container');
const registerBtn = document.getElementById('registerToggle');
const loginBtn = document.getElementById('loginToggle');
const registerButton = document.getElementById('registerButton');
const loginButton = document.getElementById('loginButton');

// Alternar entre formulários de login e registro
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Função de cadastro
registerButton.addEventListener('click', async () => {
    const nome = document.getElementById('registerName').value;
    const cpf = document.getElementById('registerCpf').value;
    const email = document.getElementById('registerEmail').value;
    const senha = document.getElementById('registerPassword').value;

    console.log({ nome, cpf, email, senha }); // Para depuração

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nome, cpf, email, senha }),
        });

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        console.log(data); // Ver resposta no console

        if (response.ok) {
            alert(data.message || 'Usuário cadastrado com sucesso!'); // Alerta para sucesso
            document.getElementById('registerForm').reset(); // Resetar formulário
            window.location.href = '/index.html'; // Redirecionar após cadastro
        } else {
            alert(data.message || 'Erro ao cadastrar. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao cadastrar. Tente novamente.');
    }
});

// Função de login
loginButton.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginPassword').value;

    console.log({ email, senha }); // Para depuração

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, senha }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data); // Ver dados no console

            // Redirecionar após login bem-sucedido
            window.location.href = '/inicio.html'; 
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Erro no login. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro no login. Tente novamente.');
    }
});
//logout



