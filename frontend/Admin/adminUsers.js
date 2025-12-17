const API_BASE_URL = 'http://localhost:8081'; 

function getToken() {
    return localStorage.getItem('token');
}

async function fetchUsers() {
    const token = getToken();
    if (!token) {
        alert('Помилка авторизації: токен відсутній.');
        return [];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (response.ok && data.Success) {
            return data.users; 
        } else {
            alert(`Помилка завантаження користувачів: ${data.Error || response.statusText}. Деталі: ${data.Details || 'Немає'}`);
            console.error("Помилка завантаження користувачів:", data.Error || response.statusText);
            return [];
        }

    } catch (error) {
        console.error("Помилка мережі при завантаженні користувачів:", error);
        alert('Помилка мережі при завантаженні користувачів. Перевірте, чи працює бекенд.');
        return [];
    }
}

async function deleteUser(id) {
    if (!confirm(`Ви впевнені, що хочете видалити користувача ID ${id}? Це незворотна дія! Будуть видалені всі пов'язані записи.`)) {
        return false;
    }

    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (response.ok && data.Success) {
            alert(data.Message);
            return true;
        } else {
            alert(`Помилка видалення: ${data.Error || response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error("Помилка мережі при видаленні користувача:", error);
        alert('Помилка мережі при видаленні користувача.');
        return false;
    }
}

async function makeUserDoctor(id, fullName) { 
    if (!confirm(`Ви впевнені, що хочете змінити роль користувача ${fullName} (ID ${id}) на 'Doctor'?`)) {
        return false;
    }

    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newRole: 'Doctor', fullName: fullName }) 
        });

        const data = await response.json();
        if (response.ok && data.Success) {
            alert(data.Message);
            return true;
        } else {
            alert(`Помилка зміни ролі: ${data.Error || response.statusText}. Деталі: ${data.Details || 'Немає'}`);
            return false;
        }
    } catch (error) {
        console.error("Помилка мережі при зміні ролі користувача:", error);
        alert('Помилка мережі при зміні ролі користувача.');
        return false;
    }
}

async function removeUserDoctorRole(id) {
    if (!confirm(`Ви впевнені, що хочете забрати роль 'Doctor' у користувача ID ${id}?`)) {
        return false;
    }

    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (response.ok && data.Success) {
            alert(data.Message);
            return true;
        } else {
            alert(`Помилка забирання ролі: ${data.Error || response.statusText}. Деталі: ${data.Details || 'Немає'}`);
            return false;
        }
    } catch (error) {
        console.error("Помилка мережі при забиранні ролі:", error);
        alert('Помилка мережі при забиранні ролі.');
        return false;
    }
}

async function handleAddUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const messageElement = document.getElementById('addUserMessage');
    
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;

    messageElement.textContent = 'Створення...';
    messageElement.style.color = 'blue';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        // Перевірка, чи відповідь містить JSON, перш ніж парсити
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            if (!response.ok) {
                // Це, ймовірно, 404/500 без JSON-тіла
                throw new Error(`Помилка сервера (${response.status}): Недійсний формат відповіді (не JSON).`);
            }
            // Якщо 200 ОК, але без JSON, це теж проблема
            throw new Error(`Помилка: Успішна відповідь, але тіло не є JSON.`);
        }

        if (response.ok && data.Success) {
            messageElement.textContent = ` Користувач ${name} (${email}) успішно створений.`;
            messageElement.style.color = 'green';
            form.reset();
            
            const container = document.getElementById('tool-details-container');
            if (container) {
                const users = await fetchUsers();
                renderUsersTable(container, users);
            }

        } else {
            const errorMessage = data.Error || 'Невідома помилка реєстрації.';
            messageElement.textContent = ` Помилка: ${errorMessage}`;
            messageElement.style.color = 'red';
            console.error("Помилка додавання користувача:", errorMessage);
        }
    } catch (error) {
        console.error("Помилка мережі або JSON.parse:", error);
        messageElement.textContent = ` Помилка: ${error.message}. Перевірте, чи бекенд-маршрут /auth/signup працює (404/500).`;
        messageElement.style.color = 'red';
    }
}

function renderAddUserForm(container) {
    const formHtml = `
        <div class="add-user-container">
            <h3>➕ Додати нового користувача</h3>
            <form id="addUserForm" class="admin-form">
                <div class="form-group">
                    <label for="newUserName">П.І.Б.</label>
                    <input type="text" id="newUserName" required>
                </div>
                <div class="form-group">
                    <label for="newUserEmail">Email:</label>
                    <input type="email" id="newUserEmail" required>
                </div>
                <div class="form-group">
                    <label for="newUserPassword">Пароль:</label>
                    <input type="password" id="newUserPassword" required>
                </div>
                <button type="submit" class="action-btn">Створити користувача</button>
                <p id="addUserMessage" class="info-message"></p>
            </form>
        </div>
        <hr class="separator">
        <h3>Список користувачів</h3>
    `;
    
    container.insertAdjacentHTML('afterbegin', formHtml);

    const form = document.getElementById('addUserForm');
    if (form) {
        form.addEventListener('submit', handleAddUserSubmit);
    }
}

function renderUsersTable(container, users) {
    
    const oldTable = container.querySelector('.data-table');
    if (oldTable) oldTable.remove();
    
    const header = container.querySelector('h3:last-of-type');
    if (header) {
        header.textContent = `Список користувачів (${users.length})`;
    }


    if (users.length === 0) {
        container.insertAdjacentHTML('beforeend', `
            <p class="info-message">Користувачів не знайдено.</p>
        `);
        return;
    }

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Ім'я</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Дата створення</th>
                    <th>Дії</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr data-id="${user.id_login}" data-name="${user.name}">
                        <td>${user.id_login}</td>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email}</td>
                        <td><span class="badge badge-${user.role === 'Admin' ? 'admin' : user.role === 'Doctor' ? 'doctor' : 'user'}">${user.role || 'User'}</span></td>
                        <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('uk-UA') : 'N/A'}</td>
                        <td>
                            <button class="action-btn delete-user-btn" data-id="${user.id_login}" ${user.role === 'Admin' ? 'disabled title="Неможливо видалити адміністратора"' : ''}>Видалити</button>
                            ${user.role === 'Doctor' ? 
                                `<button class="action-btn remove-doctor-btn" data-id="${user.id_login}">Забрати роль</button>` :
                                user.role !== 'Admin' ?
                                `<button class="action-btn promote-doctor-btn" data-id="${user.id_login}" data-name="${user.name}">Зробити Лікарем</button>` : 
                                ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.insertAdjacentHTML('beforeend', tableHTML);

    container.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            if (e.target.disabled) return; 
            const userId = e.target.getAttribute('data-id');
            if (await deleteUser(userId)) {
                initializeUsersManagement(container); 
            }
        });
    });
    
    container.querySelectorAll('.promote-doctor-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const userName = e.target.getAttribute('data-name');
            if (await makeUserDoctor(userId, userName)) { 
                initializeUsersManagement(container); 
            }
        });
    });

    container.querySelectorAll('.remove-doctor-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            if (await removeUserDoctorRole(userId)) {
                initializeUsersManagement(container); 
            }
        });
    });
}


export async function initializeUsersManagement(container) {
    container.innerHTML = '<h3>Завантаження даних користувачів...</h3>';
    
    const users = await fetchUsers();
    
    container.innerHTML = '';
    
    renderAddUserForm(container);
    
    renderUsersTable(container, users);
}