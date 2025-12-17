window.initPasswordUpdate = () => {
    const apiUrl = window.apiUrl;
    const token = window.token;
    
    const passwordForm = document.getElementById('password-form');
    
    if (!passwordForm) {
        console.error("Password form element not found with ID 'password-form'.");
        return;
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmNewPassword) {
            window.displayMessage("Новий пароль та підтвердження не збігаються.", false);
            return;
        }

        if (newPassword.length < 6) {
             window.displayMessage("Новий пароль має бути принаймні 6 символів.", false);
             return;
        }

        try {
            const response = await fetch(`${apiUrl}/auth/update-password`, { 
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword: oldPassword,
                    newPassword: newPassword
                })
            });
            
            let data;
            
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (jsonError) {
                const responseText = await response.text();
                console.error("Помилка JSON.parse. Сервер повернув HTTP-статус:", response.status, ", Тіло:", responseText); 
                window.displayMessage(`Критична помилка сервера (${response.status}). Некоректна відповідь.`, false);
                return; 
            }

            if (response.ok && data.Success) {
                window.displayMessage(data.Message || "Пароль успішно оновлено! Необхідний повторний вхід.", true);
                
                passwordForm.reset(); 
                
            } else {
                window.displayMessage(data.Error || `Помилка оновлення пароля: ${data.Message || 'Невідома помилка.'}`, false);
            }
        } catch (error) {
            console.error('Error updating password:', error);
            window.displayMessage("Помилка підключення до сервера під час оновлення пароля.", false);
        }
    };

    passwordForm.addEventListener('submit', handlePasswordUpdate);

    window.handlePasswordUpdate = handlePasswordUpdate; 
};