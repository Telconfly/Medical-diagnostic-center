import { initializeDoctorsManagement } from './adminDoctors.js';
import { initializeServicesManagement } from './adminServices.js';
import { initializeUsersManagement } from './adminUsers.js';

const API_BASE_URL = 'http://localhost:8081';

const authStatusMessage = document.getElementById('auth-status-message');
const adminContent = document.getElementById('admin-content');
const toolDetailsContainer = document.getElementById('tool-details-container');
const toolsGrid = document.querySelector('.admin-tools .tools-grid');

function getToken() {
    return localStorage.getItem('token');
}

function isAdmin() {
    const token = getToken();
    
    if (!token || typeof window.isTokenValid !== 'function' || !window.isTokenValid(token)) {
        return false;
    }

    try {
        if (typeof window.decodeJwt !== 'function') {
            console.error('Функція decodeJwt не визначена. Перевірте підключення auth.js.');
            return false;
        }

        const payload = window.decodeJwt(token); 
        const isUserAdmin = payload && payload.role === 'Admin';
        
        return isUserAdmin;
    } catch (e) {
        console.error('Помилка декодування токена:', e);
        return false;
    }
}

async function fetchAdminStats() {
    const token = getToken();
    if (!token) throw new Error("Токен відсутній.");

    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const errorData = await response.json();
                errorText = errorData.Error || errorText;
            } catch (e) {
            }
            throw new Error(`Помилка сервера (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();

        if (data.Success) {
            document.getElementById('total-users-count').textContent = data.stats.totalUsers || 0;
            document.getElementById('today-appointments-count').textContent = data.stats.todayAppointments || 0;
            document.getElementById('active-services-count').textContent = data.stats.activeServices || 0;
        } else {
            throw new Error(`Помилка логіки сервера: ${data.Error || 'Невідома помилка'}`);
        }

    } catch (error) {
        console.error('Помилка при завантаженні статистики:', error);
        throw error;
    }
}

async function handleToolClick(event) {
    const button = event.target.closest('.tool-btn');
    if (!button) return;

    const action = button.getAttribute('data-action');
    
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    if (toolDetailsContainer) {
        toolDetailsContainer.innerHTML = ''; 

        switch (action) {
            case 'manage-doctors':
                await initializeDoctorsManagement(toolDetailsContainer);
                break;

            case 'manage-services':
                await initializeServicesManagement(toolDetailsContainer); 
                break;
            
            case 'view-users':
                await initializeUsersManagement(toolDetailsContainer);
                break;
            case 'view-appointments':
                toolDetailsContainer.innerHTML = `<h3>Ви обрали: Всі записи</h3><p>Тут буде реалізована таблиця з усіма записами клієнтів (лікар/послуга).</p>`;
                break;

            default:
                toolDetailsContainer.innerHTML = `
                    <h3>Ви обрали: ${action}</h3>
                    <p>Інтерфейс для цього інструменту ще не реалізовано.</p>
                `;
                break;
        }
    }
}


async function initAdminPanel() {
    if (typeof window.isTokenValid !== 'function' || typeof window.decodeJwt !== 'function') {
        authStatusMessage.textContent = 'Помилка ініціалізації: не завантажено auth.js. Перевірка доступу неможлива.';
        authStatusMessage.classList.add('error-message');
        adminContent.style.display = 'none';
        return;
    }


    const tokenIsValid = window.isTokenValid(getToken());
    const isUserAdmin = isAdmin();

    if (!tokenIsValid || !isUserAdmin) {
        const message = !tokenIsValid 
            ? 'Доступ заборонено. Термін сесії закінчився або токен недійсний. Будь ласка, увійдіть.'
            : 'Доступ заборонено. У вас недостатньо прав (потрібна роль: Адміністратор).';
            
        authStatusMessage.textContent = message;
        authStatusMessage.classList.remove('info-message', 'success-message');
        authStatusMessage.classList.add('error-message');
        adminContent.style.display = 'none';

        setTimeout(() => {
            window.location.href = "../Home/Home.html";
        }, 3000); 
        return;
    }

    authStatusMessage.textContent = 'Доступ надано. Ласкаво просимо, Адміністраторе!';
    authStatusMessage.classList.remove('info-message', 'error-message');
    authStatusMessage.classList.add('success-message');
    adminContent.style.display = 'block';

    try {
        await fetchAdminStats(); 
    } catch (e) {
        console.error("Помилка завантаження статистики. Блокування інтерфейсу:", e);
        authStatusMessage.textContent = `Помилка завантаження даних. Спробуйте увійти знову. (${e.message})`;
        authStatusMessage.classList.remove('success-message');
        authStatusMessage.classList.add('error-message');
        adminContent.style.display = 'none';
        return;
    }
    
    if (toolsGrid) {
        toolsGrid.addEventListener('click', handleToolClick);
    }
    
    setTimeout(async () => {
        await initializeDoctorsManagement(toolDetailsContainer);
        
        const manageDoctorsBtn = document.querySelector('.tool-btn[data-action="manage-doctors"]');
        if (manageDoctorsBtn) {
            manageDoctorsBtn.classList.add('active');
        }
    }, 50);
}

window.initAdminPanel = initAdminPanel;