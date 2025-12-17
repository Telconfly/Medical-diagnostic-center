import { validateSignup } from '../Utils/signupValidation.js'; 

function displayErrors(errors) {
    const fields = ['name', 'email', 'password'];
    
    fields.forEach(field => {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
    });


    for (const field in errors) {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = errors[field];
        }
    }
}

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log("КРОК 1: Започатковано процес реєстрації.");

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;


    const validationErrors = validateSignup(name, email, password);
    

    displayErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
        console.warn("КРОК 2: Клієнтська валідація не пройдена. Відправка запиту скасована.");
        return;
    }
    
    console.log("КРОК 3: Дані для відправки:", { name, email, password: '*'.repeat(password.length) });

    try {
        console.log("КРОК 4: Відправка POST-запиту до http://localhost:8081/auth/signup...");
        
        const response = await fetch("http://localhost:8081/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log(`КРОК 5: Отримана відповідь від сервера. Статус: ${response.status}`);
        
        if (response.status === 404) {
             throw new Error("404: Маршрут реєстрації не знайдено.");
        }
        
        const data = await response.json();
        console.log("КРОК 6: Обробка відповіді. Тіло відповіді:", data);

        if (data.Success && data.token) {
            localStorage.setItem('token', data.token);
            console.log("КРОК 7 (УСПІХ): Токен успішно збережено.");
            alert("Реєстрація успішна! Ви увійшли.");
            window.location.href = "../Home/Home.html"; 
        } else {
            
            console.error("КРОК 7 (ПОМИЛКА СЕРВЕРА):", data.Error);
            alert("Помилка реєстрації: " + (data.Error || "Невідома помилка."));
        }

    } catch (error) {
        console.error("КРОК 8 (ПОМИЛКА МЕРЕЖІ): Виникла помилка.", error);
        alert("Виникла помилка мережі або сервер не відповідає.");
    }
});