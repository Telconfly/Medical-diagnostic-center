const API_BASE_URL = 'http://localhost:8081';
const SERVICE_DURATION_DEFAULT = 30; 

const getToken = () => localStorage.getItem('token'); 

async function fetchAllServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`); 

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const services = await response.json();
        if (services.Error) throw new Error(services.Error);

        return services.map(s => ({
            idService: s.idService, 
            name: s.name,
            description: s.description,
            price: s.price,
            duration: s.duration || SERVICE_DURATION_DEFAULT,
            imageUrl: s.imageUrl 
        }));

    } catch (error) {
        console.error("[Services] Помилка завантаження послуг:", error);
        alert(`Помилка: Не вдалося завантажити дані послуг. ${error.message}`);
        return [];
    }
}

function renderServicesManagement(container, services) {
    container.innerHTML = `
        <div class="doctor-management-header">
            <h3>Управління послугами</h3>
            <button class="action-btn add-btn" data-action="add-service-form">
                + Додати Нову Послугу
            </button>
        </div>

        <table class="doctors-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Назва</th>
                    <th>Ціна (грн)</th>
                    <th>Тривалість (хв)</th>
                    <th>Зображення</th>
                    <th>Дії</th>
                </tr>
            </thead>
            <tbody>
                ${services.map(service => `
                    <tr>
                        <td>${service.idService}</td>
                        <td>${service.name}</td>
                        <td>${parseFloat(service.price).toFixed(2)}</td>
                        <td>${service.duration}</td>
                        <td>
                            ${service.imageUrl 
                                ? `<img src="${API_BASE_URL}/images/${service.imageUrl}" alt="${service.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">` 
                                : '—'}
                        </td>
                        <td>
                            <button class="action-btn edit-btn" data-id="${service.idService}" data-action="edit-service-form">Редагувати</button>
                            <button class="action-btn delete-btn" data-id="${service.idService}" data-name="${service.name}" data-action="delete-service">Видалити</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', handleServiceAction);
    });
}


function renderServiceForm(container, mode, serviceData = {}) {
    const isEdit = mode === 'edit';
    const formTitle = isEdit ? `Редагування послуги: ${serviceData.name}` : 'Додавання нової послуги';
    const submitText = isEdit ? 'Зберегти зміни' : 'Додати послугу';

    container.innerHTML = `
        <h3>${formTitle}</h3>
        <form id="service-form" class="admin-form" enctype="multipart/form-data">
            ${isEdit ? `<input type="hidden" id="idService" name="idService" value="${serviceData.idService}">` : ''}

            <label for="name">Назва послуги:</label>
            <input type="text" id="name" name="name" value="${serviceData.name || ''}" required>

            <label for="price">Ціна (грн):</label>
            <input type="number" id="price" name="price" step="0.01" min="0" value="${parseFloat(serviceData.price || 0).toFixed(2)}" required>

            <label for="duration">Тривалість (хв):</label>
            <input type="number" id="duration" name="duration" min="1" value="${serviceData.duration || SERVICE_DURATION_DEFAULT}" required>
            
            <label for="description">Опис:</label>
            <textarea id="description" name="description" rows="5" required>${serviceData.description || ''}</textarea>
            
            <label for="imageUpload">${isEdit ? 'Замінити зображення (залиште порожнім, щоб зберегти поточне):' : 'Зображення:'}</label>
            <input type="file" id="imageUpload" name="imageUpload" accept="image/*" ${isEdit ? '' : 'required'}>
            
            ${isEdit && serviceData.imageUrl ? 
                `<p class="current-image-note">Поточне зображення: **${serviceData.imageUrl}** (буде замінено при завантаженні нового)</p>` : ''}


            <button type="submit" class="action-btn submit-btn">${submitText}</button>
            <button type="button" class="action-btn back-btn" data-action="manage-services">
                ← Скасувати та повернутися
            </button>
            <p id="service-form-message" class="info-message"></p>
        </form>
    `;

    document.getElementById('service-form').addEventListener('submit', handleServiceFormSubmit);
    
    document.querySelector('.back-btn').addEventListener('click', (e) => {
        const toolsGrid = document.querySelector('.admin-tools .tools-grid');
        const manageServicesBtn = toolsGrid.querySelector('[data-action="manage-services"]');
        if(manageServicesBtn) manageServicesBtn.click();
    });
}

async function handleServiceAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const serviceId = button.getAttribute('data-id');
    const serviceName = button.getAttribute('data-name');
    const container = document.getElementById('tool-details-container');

    switch (action) {
        case 'add-service-form':
            renderServiceForm(container, 'add');
            break;
        case 'edit-service-form':
            const allServices = await fetchAllServices();
            const serviceToEdit = allServices.find(s => s.idService === parseInt(serviceId));
            if (serviceToEdit) {
                renderServiceForm(container, 'edit', serviceToEdit);
            } else {
                alert('Помилка: Послугу не знайдено.');
            }
            break;
        case 'delete-service':
            if (confirm(`Ви впевнені, що хочете видалити послугу "${serviceName}" (ID: ${serviceId})? Це видалить усі пов'язані записи.`)) {
                await deleteService(serviceId, serviceName);
            }
            break;
    }
}

async function deleteService(id, name) {
    const token = getToken();
    if (!token) return alert("Помилка авторизації. Увійдіть знову.");

    try {
        const response = await fetch(`${API_BASE_URL}/admin/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        
        if (response.ok && result.Success) {
            alert(` Послугу "${name}" успішно видалено.`);
            await initializeServicesManagement(document.getElementById('tool-details-container')); 
        } else {
            throw new Error(result.Error || 'Невідома помилка видалення.');
        }

    } catch (error) {
        console.error("Помилка видалення послуги:", error);
        alert(` Помилка видалення послуги "${name}": ${error.message}`);
    }
}


async function handleServiceFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const idService = formData.get('idService');
    const formMessage = document.getElementById('service-form-message');
    const submitBtn = form.querySelector('.submit-btn');
    const container = document.getElementById('tool-details-container');
    
    if (!idService && (!formData.get('imageUpload') || formData.get('imageUpload').size === 0)) {
        formMessage.textContent = ' Необхідно завантажити зображення для нової послуги.';
        formMessage.style.color = 'red';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = idService ? 'Збереження...' : 'Додавання...';
    formMessage.textContent = 'Відправка даних на сервер...';
    formMessage.style.color = 'orange';

    const token = getToken();
    if (!token) {
        submitBtn.disabled = false;
        return alert("Помилка авторизації. Увійдіть знову.");
    }

    const endpoint = idService ? `${API_BASE_URL}/admin/services/${idService}` : `${API_BASE_URL}/admin/services`;
    const method = idService ? 'PUT' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData 
        });

        const result = await response.json();
        
        if (response.ok && result.Success) {
            formMessage.textContent = ` Успішно! Послугу "${formData.get('name')}" ${idService ? 'оновлено' : 'додано'}!`;
            formMessage.style.color = 'green';
            
            setTimeout(() => initializeServicesManagement(container), 3000); 

        } else {
            throw new Error(result.Error || 'Невідома помилка сервера.');
        }

    } catch (error) {
        console.error(`Помилка ${method} послуги:`, error);
        formMessage.textContent = ` Помилка: ${error.message}`;
        formMessage.style.color = 'red';

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = idService ? 'Зберегти зміни' : 'Додати послугу';
    }
}


export async function initializeServicesManagement(container) {
    if (!container) return;
    
    container.innerHTML = '<h3>Завантаження даних...</h3>';
    const services = await fetchAllServices();
    
    renderServicesManagement(container, services);
}