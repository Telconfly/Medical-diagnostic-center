/**
 * Модуль автентифікації.
 * Надає функції декодування JWT, перевірки валідності токена
 * та ініціалізації UI заголовка залежно від стану авторизації.
 */

/**
 * Декодує payload JWT-токена без верифікації підпису.
 * @param {string} token
 * @returns {object|null}
 */
const decodeJwt = (token) => {
    try {
        const payloadBase64 = token.split('.')[1];
        return JSON.parse(atob(payloadBase64));
    } catch (e) {
        console.error('Помилка декодування JWT:', e);
        return null;
    }
};

/**
 * Перевіряє, чи токен є валідним та не прострочений.
 * При простроченні видаляє токен з localStorage.
 * @param {string|null} token
 * @returns {boolean}
 */
const isTokenValid = (token) => {
    if (!token) return false;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTime) {
        localStorage.removeItem('token');
        return false;
    }

    return true;
};

window.isTokenValid = isTokenValid;
window.decodeJwt    = decodeJwt;

/**
 * Ініціалізує UI заголовка відповідно до стану авторизації.
 * Викликається з loadHeader.js після вставки хедера у DOM.
 */
window.initAuthUI = () => {
    const token        = localStorage.getItem('token');
    const tokenIsValid = isTokenValid(token);

    const loginButton   = document.getElementById('login-button');
    const signupButton  = document.getElementById('signup-button');
    const profileButton = document.getElementById('profile-button');
    const logoutButton  = document.getElementById('logout-button');
    const adminButton   = document.getElementById('admin-button');

    if (tokenIsValid) {
        if (loginButton)   loginButton.style.display   = 'none';
        if (signupButton)  signupButton.style.display  = 'none';
        if (profileButton) profileButton.style.display = 'block';
        if (logoutButton)  logoutButton.style.display  = 'block';

        const payload  = decodeJwt(token);
        const userRole = payload ? payload.role : 'User';

        if (adminButton) {
            adminButton.style.display = userRole === 'Admin' ? 'block' : 'none';
        }
    } else {
        if (loginButton)   loginButton.style.display   = 'block';
        if (signupButton)  signupButton.style.display  = 'block';
        if (profileButton) profileButton.style.display = 'none';
        if (logoutButton)  logoutButton.style.display  = 'none';
        if (adminButton)   adminButton.style.display   = 'none';
    }

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '../Home/Home.html';
    };

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
};