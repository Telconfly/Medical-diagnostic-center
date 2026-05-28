import { validateSignup } from '../Utils/signupValidation.js';

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

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('name').value;
    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const validationErrors = validateSignup(name, email, password);
    displayErrors(validationErrors, ['name', 'email', 'password']);

    if (Object.keys(validationErrors).length > 0) return;

    try {
        const response = await fetch('http://localhost:8081/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        if (response.status === 404) {
            throw new Error('Маршрут реєстрації не знайдено (404).');
        }

        const data = await response.json();

        if (data.Success && data.token) {
            localStorage.setItem('token', data.token);
            alert('Реєстрація успішна! Ви увійшли.');
            window.location.href = '../Home/Home.html';
        } else {
            alert('Помилка реєстрації: ' + (data.Error || 'Невідома помилка.'));
        }
    } catch (error) {
        console.error('Помилка мережі при реєстрації:', error);
        alert('Виникла помилка мережі або сервер не відповідає.');
    }
});