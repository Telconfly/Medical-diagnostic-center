const decodeJwt = (token) => {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = atob(payloadBase64);
        return JSON.parse(decodedPayload);
    } catch (e) {
        console.error("AUTH.JS [ERROR]: Помилка декодування JWT.", e);
        return null;
    }
};

const isTokenValid = (token) => {
    if (!token) return false;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) {
        console.warn("AUTH.JS [WARN]: Payload токена не містить 'exp' (термін дії). Вважаємо невалідним.");
        return false;
    }

    const currentTime = Math.floor(Date.now() / 1000); 
    
    if (payload.exp < currentTime) {
        console.warn("AUTH.JS [WARN]: Токен ПРОСТРОЧЕНО. Видаляємо його з localStorage.");
        localStorage.removeItem('token'); 
        return false;
    }

    return true;
};

window.isTokenValid = isTokenValid;
window.decodeJwt = decodeJwt; 

window.initAuthUI = () => {
    console.log("=================================================");
    console.log("AUTH.JS: Скрипт ініціалізовано після завантаження ХЕДЕРУ.");
    
    const token = localStorage.getItem('token');
    const tokenIsValid = isTokenValid(token); 
    
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');
    const profileButton = document.getElementById('profile-button');
    const logoutButton = document.getElementById('logout-button');
    const adminButton = document.getElementById('admin-button'); 

    const updateUI = () => {
        if (tokenIsValid) {
            console.log("AUTH.JS [UI]: Встановлено режим 'УВІЙШОВ'.");
            
            if (loginButton) loginButton.style.display = 'none';
            if (signupButton) signupButton.style.display = 'none';
            if (profileButton) profileButton.style.display = 'block'; 
            if (logoutButton) logoutButton.style.display = 'block'; 
            
            const payload = decodeJwt(token);
            const userRole = payload ? payload.role : 'User'; 
            
            console.log(`AUTH.JS [ROLE]: Виявлена роль користувача: ${userRole}`);

            if (adminButton) {
                if (userRole === 'Admin') {
                    adminButton.style.display = 'block';
                    console.log("AUTH.JS [ROLE]: Кнопка 'Адмін' відображена.");
                } else {
                    adminButton.style.display = 'none';
                    console.log("AUTH.JS [ROLE]: Кнопка 'Адмін' прихована (користувач не Адмін).");
                }
            }

        } else {
            console.log("AUTH.JS [UI]: Встановлено режим 'ВИЙШОВ'.");
            
            if (loginButton) loginButton.style.display = 'block';     
            if (signupButton) signupButton.style.display = 'block';   
            if (profileButton) profileButton.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if (adminButton) adminButton.style.display = 'none'; 
        }
        console.log("=================================================");
    };

    const handleLogout = (e) => { 
        e.preventDefault(); 
        console.log("AUTH.JS [LOGOUT]: Запуск процедури виходу.");
        localStorage.removeItem('token');
        alert("Ви успішно вийшли з облікового запису.");
        window.location.href = "../Home/Home.html";
    };

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout); 
    }

    updateUI();
};