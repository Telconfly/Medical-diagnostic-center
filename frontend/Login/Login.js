import { validateLogin } from '../Utils/loginValidation.js';

/**
 * Відображає помилки валідації під відповідними полями форми.
 * @param {object} errors - { fieldName: 'повідомлення про помилку' }
 * @param {string[]} fields - перелік полів форми
 */
function displayErrors(errors, fields) {
    fields.forEach(field => {
        const el = document.getElementById(`${field}-error`);
        if (el) el.textContent = errors[field] || '';
    });
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const validationErrors = validateLogin(email, password);
    displayErrors(validationErrors, ['email', 'password']);

    if (Object.keys(validationErrors).length > 0) return;

    try {
        const response = await fetch('http://localhost:8081/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (response.status === 404) {
            throw new Error('Маршрут авторизації не знайдено (404).');
        }

        const data = await response.json();

        if (data.Success && data.token) {
            localStorage.setItem('token', data.token);
            alert('Вхід успішний!');
            window.location.href = '../Home/Home.html';
        } else {
            alert('Помилка входу: ' + (data.Error || 'Невідома помилка.'));
        }
    } catch (error) {
        console.error('Помилка мережі при вході:', error);
        alert('Виникла помилка мережі або сервер не відповідає.');
    }
});