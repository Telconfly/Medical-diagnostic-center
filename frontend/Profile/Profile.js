document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const messageArea = document.getElementById('profile-message');
    const doctorAppointmentsContainer = document.getElementById('appointments-history');
    const serviceAppointmentsContainer = document.getElementById('service-appointments-history');
    const myDoctorAppointmentsContainer = document.getElementById('my-doctor-appointments-history');
    const tabButtons = document.querySelectorAll('.tab-button');
    const token = localStorage.getItem('token');
    const apiUrl = "http://localhost:8081";
    let userRole = null;

    window.displayMessage = (message, isSuccess = true) => {
        messageArea.textContent = message;
        messageArea.style.display = 'block';
        messageArea.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
        messageArea.style.color = isSuccess ? '#155724' : '#721c24';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000);
    };
    window.apiUrl = apiUrl;
    window.token = token;
    window.myDoctorAppointmentsContainer = myDoctorAppointmentsContainer;

    if (!token || !window.isTokenValid(token)) {
        window.displayMessage("Доступ заборонено. Будь ласка, увійдіть.", false);
        window.location.href = "../Login/Login.html";
        return;
    }

    const switchTab = (tabId) => {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabId}-tab`);
        if (activeContent) activeContent.classList.add('active');
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (activeButton) activeButton.classList.add('active');
    };
    window.switchTab = switchTab;

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    const handleCancelAppointment = async (appointmentId, type, context) => {
        let confirmMessage;
        if (context === 'doctor_cancels_patient') {
            confirmMessage = 'Ви впевнені, що хочете скасувати цей запис пацієнту?';
        } else {
            confirmMessage = `Ви впевнені, що хочете скасувати цей запис на ${type === 'doctor' ? 'консультацію' : 'послугу'}?`;
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        const endpoint = type === 'doctor' ? `${apiUrl}/cancel-doctor-appointment` : `${apiUrl}/cancel-service-appointment`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ appointmentId })
            });

            const data = await response.json();

            if (response.ok && data.Success) {
                window.displayMessage(data.Message, true);
                if (type === 'doctor') {
                    loadDoctorAppointmentsHistory();
                    if (userRole === 'Doctor') {
                        loadMyDoctorAppointmentsAsPatient(myDoctorAppointmentsContainer);
                    }
                } else {
                    loadServiceAppointmentsHistory();
                }
            } else {
                window.displayMessage(data.Error || "Помилка скасування запису.", false);
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            window.displayMessage("Помилка підключення до сервера.", false);
        }
    };
    window.handleCancelAppointment = handleCancelAppointment;


    const handleDeleteAppointment = async (appointmentId, type) => {
        if (!confirm('Ви впевнені, що хочете остаточно видалити цей скасований запис з історії?')) {
            return;
        }

        
        const endpoint = type === 'doctor' 
            ? `${apiUrl}/delete-appointment` 
            : `${apiUrl}/delete-service-appointment`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ appointmentId })
            });

            const data = await response.json();

            if (response.ok && data.Success) {
                window.displayMessage(data.Message, true);
                if (type === 'doctor') {
                    loadDoctorAppointmentsHistory();
                    if (userRole === 'Doctor') {
                        loadMyDoctorAppointmentsAsPatient(myDoctorAppointmentsContainer);
                    }
                } else {
                    
                    loadServiceAppointmentsHistory();
                }
            } else {
                window.displayMessage(data.Error || "Помилка видалення запису.", false);
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            window.displayMessage("Помилка підключення до сервера під час видалення.", false);
        }
    };
    window.handleDeleteAppointment = handleDeleteAppointment;

    const renderAppointments = (container, appointments, type = 'doctor', isDoctorView = false) => {
        if (!container) return;

        const currentSubtitles = container.querySelectorAll('.history-subtitle, .info-message, .error-message');
        container.innerHTML = '';
        currentSubtitles.forEach(el => container.appendChild(el));

        if (appointments.length === 0) {
            const messageText = isDoctorView
                ? 'Немає запланованих/минулих записів від пацієнтів.'
                : `Немає запланованих/минулих записів на ${type === 'doctor' ? 'консультацію' : 'послугу'}.`;
            if (!container.querySelector('.info-message')) {
                container.insertAdjacentHTML('beforeend', `<p class="info-message">${messageText}</p>`);
            }
            return;
        }

        const list = document.createElement('ul');
        list.className = 'appointment-list';

        appointments.forEach(app => {
            const listItem = document.createElement('li');
            listItem.className = `appointment-item status-${app.status.toLowerCase().replace(' ', '-')}`;

            const date = new Date(app.date).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });

            let detailsHTML;
            if (isDoctorView) {
                detailsHTML = `Пацієнт: <strong>${app.patientName}</strong><br>Пошта: <em>${app.patientEmail || 'не вказано'}</em><br>Спеціалізація: ${app.specialization}`;
            } else if (type === 'doctor') {
                detailsHTML = `Тип: Консультація<br>Лікар: <strong>${app.doctorName}</strong><br>Спеціалізація: <em>${app.specialization}</em>`;
            } else {
                detailsHTML = `Тип: Послуга<br>Послуга: <strong>${app.serviceName}</strong><br>Тривалість: <em>${app.duration} хв</em>`;
            }

            const statusLower = app.status.toLowerCase();
            const isCancellable = statusLower === 'заплановано';
            const isDeletable = statusLower === 'скасовано';
            const cancelContext = isDoctorView ? 'doctor_cancels_patient' : 'patient_cancels';

            const cancelButtonHTML = isCancellable ? `<button class="btn btn-cancel-appointment" data-id="${app.id}" data-type="${type}" data-context="${cancelContext}">Скасувати запис</button>` : '';
            const deleteButtonHTML = isDeletable ? `<button class="btn btn-delete-appointment" data-id="${app.id}" data-type="${type}">Видалити з історії</button>` : '';

            listItem.innerHTML = `
                <div class="appointment-header">
                    <span class="appointment-status">${app.status}</span>
                    <span class="appointment-date-time">${date} о ${app.time.substring(0, 5)}</span>
                </div>
                <p class="details-text">${detailsHTML}</p>
                <div class="appointment-actions">${cancelButtonHTML}${deleteButtonHTML}</div>
            `;
            list.appendChild(listItem);
        });

        container.appendChild(list);

        container.querySelectorAll('.btn-cancel-appointment').forEach(button => {
            button.addEventListener('click', (e) => {
                handleCancelAppointment(e.target.dataset.id, e.target.dataset.type, e.target.dataset.context);
            });
        });

        container.querySelectorAll('.btn-delete-appointment').forEach(button => {
            button.addEventListener('click', (e) => {
                handleDeleteAppointment(e.target.dataset.id, e.target.dataset.type);
            });
        });
    };
    window.renderAppointments = renderAppointments;

    async function loadDoctorAppointmentsHistory() {
        if (!doctorAppointmentsContainer) return;
        const isDoctorView = userRole === 'Doctor';
        const subtitleHTML = isDoctorView ? '<h4 class="history-subtitle">Записи Пацієнтів до Мене:</h4>' : '';
        doctorAppointmentsContainer.innerHTML = `${subtitleHTML}<p style="text-align: center;">Завантаження...</p>`;

        try {
            const response = await fetch(`${apiUrl}/user-appointments`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.Success) {
                doctorAppointmentsContainer.innerHTML = subtitleHTML;
                renderAppointments(doctorAppointmentsContainer, data.appointments, 'doctor', isDoctorView);
            } else {
                doctorAppointmentsContainer.innerHTML = `${subtitleHTML}<p class="error-message">Помилка завантаження.</p>`;
            }
        } catch (error) {
            doctorAppointmentsContainer.innerHTML = `${subtitleHTML}<p class="error-message">Помилка підключення.</p>`;
        }
    }
    window.loadDoctorAppointmentsHistory = loadDoctorAppointmentsHistory;

    async function loadMyDoctorAppointmentsAsPatient(container) {
        if (!container) return;
        const subtitleHTML = '<h4 class="history-subtitle">Мої Записи до Інших Лікарів:</h4>';
        container.innerHTML = `${subtitleHTML}<p style="text-align: center;">Завантаження...</p>`;
        try {
            const response = await fetch(`${apiUrl}/user-appointments/as-patient`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.Success) {
                container.innerHTML = subtitleHTML;
                renderAppointments(container, data.appointments, 'doctor', false);
            } else {
                container.innerHTML = `${subtitleHTML}<p class="error-message">Помилка завантаження.</p>`;
            }
        } catch (error) {
            container.innerHTML = `${subtitleHTML}<p class="error-message">Помилка підключення.</p>`;
        }
    }
    window.loadMyDoctorAppointmentsAsPatient = loadMyDoctorAppointmentsAsPatient;

    async function loadServiceAppointmentsHistory() {
        if (!serviceAppointmentsContainer) return;
        serviceAppointmentsContainer.innerHTML = '<p style="text-align: center;">Завантаження...</p>';
        try {
            const response = await fetch(`${apiUrl}/user-service-appointments`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.Success) {
                serviceAppointmentsContainer.innerHTML = '';
                renderAppointments(serviceAppointmentsContainer, data.serviceAppointments, 'service');
            } else {
                serviceAppointmentsContainer.innerHTML = `<p class="error-message">Помилка завантаження записів на послуги.</p>`;
            }
        } catch (error) {
            serviceAppointmentsContainer.innerHTML = '<p class="error-message">Помилка підключення.</p>';
        }
    }
    window.loadServiceAppointmentsHistory = loadServiceAppointmentsHistory;

    window.loadProfileData = async () => {
        try {
            const response = await fetch(`${apiUrl}/profile`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.Success) {
                const user = data.user;
                userRole = user.role;
                const doctorFieldsDiv = document.getElementById('doctor-fields');
                const userOnlyFieldsDiv = document.getElementById('user-only-fields');

                document.getElementById('name').value = user.name || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
                document.getElementById('address').value = user.address || '';
                if (user.dateOfBirth) {
                    const dob = new Date(user.dateOfBirth);
                    if (!isNaN(dob)) document.getElementById('dateOfBirth').value = dob.toISOString().split('T')[0];
                }
                document.getElementById('bio').value = user.bio || '';

                profileForm.removeEventListener('submit', window.handleProfileUpdate);
                if (user.role === 'Doctor') {
                    if (userOnlyFieldsDiv) userOnlyFieldsDiv.style.display = 'none';
                    if (doctorFieldsDiv) doctorFieldsDiv.style.display = 'block';
                    loadScript('DoctorProfile.js').then(() => { if (window.initDoctorProfile) window.initDoctorProfile(user, profileForm); });
                } else {
                    if (userOnlyFieldsDiv) userOnlyFieldsDiv.style.display = 'block';
                    if (doctorFieldsDiv) doctorFieldsDiv.style.display = 'none';
                    profileForm.addEventListener('submit', window.handleProfileUpdate);
                }
            }
        } catch (error) { console.error('Error loading profile:', error); }
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    window.handleProfileUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('address', document.getElementById('address').value);
        formData.append('dateOfBirth', document.getElementById('dateOfBirth').value);
        formData.append('bio', document.getElementById('bio').value);

        try {
            const response = await fetch(`${apiUrl}/profile/update`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (response.ok && data.Success) {
                window.displayMessage(data.Message, true);
                window.loadProfileData();
            }
        } catch (error) { window.displayMessage("Помилка оновлення.", false); }
    };

    async function initializeProfile() {
        await window.loadProfileData();
        loadServiceAppointmentsHistory();
        if (userRole === 'Doctor') {
            loadDoctorAppointmentsHistory();
            if (myDoctorAppointmentsContainer) myDoctorAppointmentsContainer.style.display = 'block';
            loadMyDoctorAppointmentsAsPatient(myDoctorAppointmentsContainer);
            const doctorHistoryButton = document.querySelector('.tab-button[data-tab="doctor-history"]');
            if (doctorHistoryButton) doctorHistoryButton.textContent = 'Консультації';
        } else {
            loadDoctorAppointmentsHistory();
            if (myDoctorAppointmentsContainer) myDoctorAppointmentsContainer.style.display = 'none';
        }
        if (document.getElementById('password-tab')) {
             loadScript('PasswordUpdate.js').then(() => { if (window.initPasswordUpdate) window.initPasswordUpdate(); });
        }
        switchTab('profile');
    }

    initializeProfile();
});