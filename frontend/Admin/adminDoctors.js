const API_BASE_URL = 'http://localhost:8081';
const APPOINTMENT_DURATION_MINUTES = 30; 

const getToken = () => localStorage.getItem('token'); 
const displayDoctorsContent = async () => {
    const container = document.getElementById('tool-details-container');
    if (container) {
        await initializeDoctorsManagement(container); 
    }
};

async function fetchAllDoctors() {
    const token = getToken(); 
    if (!token) {
        alert("Помилка авторизації. Токен відсутній.");
        return [];
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/doctors`, { 
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        }); 

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        
        if (!result.Success) throw new Error(result.Error || 'Невідома помилка API.');
        
        const doctors = result.doctors; 

        return doctors.map(d => ({
            idDoctor: d.idDoctor, 
            userId: d.userId, 
            userEmail: d.userEmail, 
            fullName: d.fullName,
            specialization: d.specialization,
            price: d.price,
            experience: d.experience,
            description: d.description,
            imageUrl: d.imageUrl 
        }));

    } catch (error) {
        console.error("[Doctors] Помилка завантаження лікарів:", error);
        alert(`Помилка: Не вдалося завантажити дані лікарів. ${error.message}`);
        return [];
    }
}

function renderDoctorsManagement(container, doctors) {
    container.innerHTML = `
        <div class="doctor-management-header">
            <h3>Управління лікарями</h3>
            <button class="action-btn add-btn" data-action="add-doctor-form">
                <i class="fas fa-plus"></i> Додати Нового Лікаря
            </button>
        </div>

        <table class="doctors-table">
            <thead>
                <tr>
                    <th>ID Лікаря</th>
                    <th>ПІБ</th>
                    <th>Спеціалізація</th>
                    <th>Ціна (грн)</th>
                    <th>Досвід (роки)</th>
                    <th>Прийом (хв)</th>
                    <th>ID Користувача</th> <th>Email Користувача</th> <th>Дії</th>
                </tr>
            </thead>
            <tbody>
                ${doctors.map(doctor => `
                    <tr>
                        <td>${doctor.idDoctor}</td>
                        <td>${doctor.fullName}</td>
                        <td>${doctor.specialization}</td>
                        <td>${parseFloat(doctor.price).toFixed(2)}</td>
                        <td>${doctor.experience}</td>
                        <td>${APPOINTMENT_DURATION_MINUTES}</td>
                        <td>${doctor.userId || '—'}</td> <td>${doctor.userEmail || '—'}</td> <td>
                            <button class="action-btn edit-btn" data-id="${doctor.idDoctor}" data-action="edit-doctor-form"><i class="fas fa-edit"></i> Редагувати</button>
                            <button class="action-btn delete-btn" data-id="${doctor.idDoctor}" data-name="${doctor.fullName}" data-action="delete-doctor"><i class="fas fa-trash-alt"></i> Видалити</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', handleDoctorAction);
    });
}


function renderDoctorForm(container, mode, doctorData = {}) {
    const isEdit = mode === 'edit';
    const formTitle = isEdit ? `Редагування лікаря: ${doctorData.fullName}` : 'Додавання нового лікаря';
    const submitText = isEdit ? 'Зберегти зміни' : 'Додати лікаря';

    container.innerHTML = `
        <h3>${formTitle}</h3>
        <form id="doctor-form" class="admin-form" enctype="multipart/form-data">
            ${isEdit ? `<input type="hidden" id="idDoctor" name="idDoctor" value="${doctorData.idDoctor}">` : ''}

            <label for="fullName">П.І.Б</label>
            <input type="text" id="fullName" name="fullName" value="${doctorData.fullName || ''}" required>

            <label for="specialization">Спеціалізація:</label>
            <input type="text" id="specialization" name="specialization" value="${doctorData.specialization || ''}" required>

            <label for="price">Ціна консультації (грн):</label>
            <input type="number" id="price" name="price" step="0.01" min="0" value="${parseFloat(doctorData.price || 0).toFixed(2)}" required>

            <label for="experience">Досвід (роки):</label>
            <input type="number" id="experience" name="experience" min="0" value="${doctorData.experience || '0'}" required>

            <label for="description">Опис:</label>
            <textarea id="description" name="description" rows="5" required>${doctorData.description || ''}</textarea>
            
            <label for="imageUpload">${isEdit ? 'Замінити зображення:' : 'Зображення:'}</label>
            <input type="file" id="imageUpload" name="imageUpload" accept="image/*" ${isEdit ? '' : 'required'}>
            
            ${isEdit && doctorData.imageUrl ? 
                `<p class="current-image-note">Поточне зображення: **${doctorData.imageUrl}** (буде замінено при завантаженні нового)</p>` : ''}


            <button type="submit" class="action-btn submit-btn">${submitText}</button>
            <button type="button" class="action-btn back-btn" data-action="manage-doctors">
                <i class="fas fa-arrow-left"></i> Скасувати та повернутися
            </button>
            <p id="doctor-form-message" class="info-message"></p>
        </form>
    `;

    document.getElementById('doctor-form').addEventListener('submit', handleDoctorFormSubmit);
    
    document.querySelector('.back-btn').addEventListener('click', (e) => {
        const toolsGrid = document.querySelector('.admin-tools .tools-grid');
        const manageDoctorsBtn = toolsGrid.querySelector('[data-action="manage-doctors"]');
        if(manageDoctorsBtn) manageDoctorsBtn.click();
    });
}

async function handleDoctorAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const doctorId = button.getAttribute('data-id');
    const doctorName = button.getAttribute('data-name');
    const container = document.getElementById('tool-details-container');

    switch (action) {
        case 'add-doctor-form':
            renderDoctorForm(container, 'add');
            break;
        case 'edit-doctor-form':
            const allDocs = await fetchAllDoctors();
            const doctorToEdit = allDocs.find(d => d.idDoctor === parseInt(doctorId));
            if (doctorToEdit) {
                renderDoctorForm(container, 'edit', doctorToEdit);
            } else {
                alert('Помилка: Лікаря не знайдено.');
            }
            break;
        case 'delete-doctor':
            if (confirm(`Ви впевнені, що хочете видалити лікаря ${doctorName} (ID: ${doctorId})? Це видалить усі його записи.`)) {
                await deleteDoctor(doctorId, doctorName);
            }
            break;
    }
}

async function deleteDoctor(id, name) {
    const token = getToken();
    if (!token) return alert("Помилка авторизації. Увійдіть знову.");

    try {
        const response = await fetch(`${API_BASE_URL}/admin/doctors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        
        if (response.ok && result.Success) {
            alert(` Лікаря ${name} успішно видалено.`);
            await initializeDoctorsManagement(document.getElementById('tool-details-container')); 
        } else {
            throw new Error(result.Error || 'Невідома помилка видалення.');
        }

    } catch (error) {
        console.error("Помилка видалення лікаря:", error);
        alert(` Помилка видалення лікаря ${name}: ${error.message}`);
    }
}


async function handleDoctorFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const idDoctor = formData.get('idDoctor');
    const formMessage = document.getElementById('doctor-form-message');
    const submitBtn = form.querySelector('.submit-btn');
    const container = document.getElementById('tool-details-container');
    
    if (!idDoctor && (!formData.get('imageUpload') || formData.get('imageUpload').size === 0)) {
        formMessage.textContent = ' Необхідно завантажити зображення для нового лікаря.';
        formMessage.style.color = 'red';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = idDoctor ? 'Збереження...' : 'Додавання...';
    formMessage.textContent = 'Відправка даних на сервер...';
    formMessage.style.color = 'orange';

    const token = getToken();
    if (!token) {
        submitBtn.disabled = false;
        return alert("Помилка авторизації. Увійдіть знову.");
    }

    const endpoint = idDoctor ? `${API_BASE_URL}/admin/doctors/${idDoctor}` : `${API_BASE_URL}/admin/doctors`;
    const method = idDoctor ? 'PUT' : 'POST';

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
            formMessage.textContent = ` Успішно! Лікаря ${formData.get('fullName')} ${idDoctor ? 'оновлено' : 'додано'}!`;
            formMessage.style.color = 'green';
            
            setTimeout(() => initializeDoctorsManagement(container), 3000); 

        } else {
            throw new Error(result.Error || 'Невідома помилка сервера.');
        }

    } catch (error) {
        console.error(`Помилка ${method} лікаря:`, error);
        formMessage.textContent = ` Помилка: ${error.message}`;
        formMessage.style.color = 'red';

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = idDoctor ? 'Зберегти зміни' : 'Додати лікаря';
    }
}

export async function initializeDoctorsManagement(container) {
    if (!container) return;
    
    container.innerHTML = '<h3>Завантаження даних...</h3>';
    const doctors = await fetchAllDoctors();
    
    renderDoctorsManagement(container, doctors);
}