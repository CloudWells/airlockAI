$(document).ready(function () {
    // Проверяем, если мы на index.html или towers.html и пользователь авторизован, добавляем кнопку "Выйти" и приветствие
    if ((window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('towers.html')) && isLoggedIn()) {
        addLogoutButtonAndUser();
    }

    $('#loginButton').click(function (event) {
        event.preventDefault();
        login();
    });

    $('#registerButton').click(function (event) {
        event.preventDefault();
        register();
    });
});

function login() {
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            // Получаем и сохраняем email пользователя после успешного входа
            return fetch('/api/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${email}` // Предполагаем, что email используется как токен
                }
            });
        } else {
            throw new Error('Неверный email или пароль');
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении данных пользователя');
        }
        return response.json();
    })
    .then(data => {
        localStorage.setItem('userEmail', data.email);
        window.location.href = 'index.html';
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert(error.message);
    });
}

async function register() {
    const email = $('#registerEmail').val();
    const password = $('#registerPassword').val();
    const confirmPassword = $('#confirmPassword').val();

    if (password !== confirmPassword) {
        alert('Пароли не совпадают!');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            alert('Регистрация прошла успешно!');
            showAuthForm();
        } else {
            const errorData = await response.json();
            alert(`Ошибка регистрации: ${errorData.message || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        alert('Ошибка при отправке запроса на регистрацию');
    }
}

function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function checkAuth() {
    if (!isLoggedIn() && !window.location.pathname.endsWith('register.html')) {
        window.location.href = 'register.html';
    }
}

function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'register.html';
}

function showAuthForm() {
    $('#authForm').show();
    $('#registerForm').hide();
}

function showRegisterForm() {
    $('#authForm').hide();
    $('#registerForm').show();
}

function addLogoutButtonAndUser() {
    const userEmail = localStorage.getItem('userEmail');
    const navBar = document.getElementById('navbarNav');
    if (navBar) {
        // Добавляем имя пользователя
        if (userEmail) {
            const userNavItem = document.createElement('li');
            userNavItem.classList.add('nav-item');
            userNavItem.innerHTML = `<span class="nav-link cool2">${userEmail}</span>`;
            navBar.querySelector('.navbar-nav').appendChild(userNavItem);
        }

        // Добавляем кнопку "Выйти"
        const logoutButton = document.createElement('a');
        logoutButton.classList.add('nav-link');
        logoutButton.href = '#';
        logoutButton.textContent = 'Выйти';
        logoutButton.addEventListener('click', logout);

        const logoutNavItem = document.createElement('li');
        logoutNavItem.classList.add('nav-item');
        logoutNavItem.appendChild(logoutButton);
        navBar.querySelector('.navbar-nav').appendChild(logoutNavItem);
    }
}

// Проверяем авторизацию при загрузке страницы
checkAuth();