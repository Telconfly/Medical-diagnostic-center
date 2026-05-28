/**
 * Логіка запису на прийом до лікаря.
 * Імпортує спільні утиліти з appointmentUtils.js.
 */

import {
    getToken,
    fetchCurrentUserProfile,
    generateTimeSlots,
} from '../Utils/appointmentUtils.js';

const API_BASE_URL              = 'http://localhost:8081';
const APPOINTMENT_DURATION_MINUTES = 30;

let currentUserData  = null;
let currentDoctorName = null;
let currentDoctorId   = null;

const modal                = document.getElementById('appointment-modal');
const closeBtn             = document.querySelector('.close-btn');
const appointmentForm      = document.getElementById('appointment-form');
const modalDoctorName      = document.getElementById('modal-doctor-name');
const userNameInput        = document.getElementById('userName');
const userEmailInput       = document.getElementById('userEmail');
const formMessage          = document.getElementById('form-message');
const timeSlotsContainer   = document.getElementById('timeSlotsContainer');
const timeSelectionError   = document.getElementById('timeSelectionError');
const appointmentDateInput = document.getElementById('appointmentDate');
const appointmentTimeInput = document.getElementById('appointmentTime');
const submitAppointmentBtn = document.getElementById('submitAppointmentBtn');

function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    formMessage.textContent = '';
    if (submitAppointmentBtn) {
        submitAppointmentBtn.disabled  = false;
        submitAppointmentBtn.textContent = 'Підтвердити Запис';
    }
}

async function fetchBookedSlots(doctorId, date) {
    if (!doctorId || !date) return [];
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/doctor-slots?idDoctor=${doctorId}&date=${date}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.bookedSlots || [];
    } catch (error) {
        console.error('Помилка отримання заброньованих слотів:', error);
        return [];
    }
}

async function updateTimeSlots() {
    const date = appointmentDateInput?.value;

    if (currentDoctorId && date) {
        timeSlotsContainer.innerHTML = '<p style="text-align:center;">Завантаження...</p>';
        const bookedSlots = await fetchBookedSlots(currentDoctorId, date);
        generateTimeSlots({
            container:  timeSlotsContainer,
            timeInput:  appointmentTimeInput,
            bookedSlots,
            duration:   APPOINTMENT_DURATION_MINUTES,
        });
    } else {
        generateTimeSlots({
            container:  timeSlotsContainer,
            timeInput:  appointmentTimeInput,
            bookedSlots: [],
            duration:   APPOINTMENT_DURATION_MINUTES,
        });
    }

    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

export async function openAppointmentModal(doctorName, doctorId) {
    if (!modal || !appointmentForm) return;

    currentDoctorName = doctorName;
    currentDoctorId   = doctorId;

    submitAppointmentBtn.textContent = 'Підтвердити Запис';
    modalDoctorName.textContent      = currentDoctorName;
    formMessage.textContent          = '';

    if (!getToken()) {
        alert('Будь ласка, увійдіть або зареєструйтеся, щоб записатися на прийом.');
        return;
    }

    if (!currentUserData) {
        currentUserData = await fetchCurrentUserProfile(API_BASE_URL);
    }

    if (!currentUserData) {
        alert('Не вдалося отримати дані вашого профілю. Спробуйте увійти знову.');
        return;
    }

    if (currentUserData.role === 'Doctor' && String(currentUserData.id) === currentDoctorId) {
        alert('Ви не можете записатися на консультацію до самого себе.');
        return;
    }

    userNameInput.value  = currentUserData.name  || '';
    userEmailInput.value = currentUserData.email || '';

    const today = new Date().toISOString().split('T')[0];
    appointmentDateInput.setAttribute('min', today);
    if (!appointmentDateInput.value || appointmentDateInput.value < today) {
        appointmentDateInput.value = today;
    }

    await updateTimeSlots();
    modal.style.display = 'block';
}

async function handleAppointmentFormSubmit(event) {
    event.preventDefault();

    const token           = getToken();
    const appointmentTime = appointmentTimeInput.value;

    if (!appointmentTime) {
        if (timeSelectionError) {
            timeSelectionError.textContent  = 'Будь ласка, оберіть час прийому.';
            timeSelectionError.style.display = 'block';
        }
        return;
    }
    if (timeSelectionError) timeSelectionError.style.display = 'none';

    if (!token || !currentUserData || !currentDoctorId) {
        formMessage.textContent  = 'Помилка: Необхідна авторизація або відсутні дані лікаря.';
        formMessage.style.color  = 'red';
        return;
    }

    const appointmentData = {
        idDoctor:   currentDoctorId,
        date:       appointmentDateInput.value,
        time:       appointmentTime,
        doctorName: currentDoctorName,
        duration:   APPOINTMENT_DURATION_MINUTES,
    };

    try {
        submitAppointmentBtn.disabled    = true;
        submitAppointmentBtn.textContent = 'Обробка...';
        formMessage.textContent          = 'Зачекайте, ваш запис обробляється...';
        formMessage.style.color          = 'orange';

        const response = await fetch(`${API_BASE_URL}/appointment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify(appointmentData),
        });

        const result = await response.json();

        if (response.ok && result.Success) {
            formMessage.textContent = `Успішно записано до лікаря ${currentDoctorName} на ${appointmentData.date} о ${appointmentData.time}!`;
            formMessage.style.color = 'green';
            await updateTimeSlots();
            submitAppointmentBtn.disabled    = false;
            submitAppointmentBtn.textContent = 'Підтвердити Запис';
            setTimeout(closeModal, 3000);
        } else {
            throw new Error(result.Error || 'Помилка запису на прийом');
        }
    } catch (error) {
        console.error('Помилка відправки запису:', error);
        submitAppointmentBtn.disabled    = false;
        submitAppointmentBtn.textContent = 'Підтвердити Запис';
        formMessage.textContent          = `Помилка: ${error.message}`;
        formMessage.style.color          = 'red';
        await updateTimeSlots();
    }
}

export function initializeAppointmentListeners() {
    // Попередньо завантажуємо профіль
    fetchCurrentUserProfile(API_BASE_URL).then(userData => {
        currentUserData = userData;
    });

    if (closeBtn) closeBtn.onclick = closeModal;

    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
    }

    if (appointmentDateInput) {
        appointmentDateInput.addEventListener('change', updateTimeSlots);
    }
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentFormSubmit);
    }
}