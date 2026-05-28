/**
 * Логіка сторінки "Послуги": відображення карток послуг,
 * пошук та запис на послугу.
 *
 * Цей файл є ES-модулем (type="module" у Services.html).
 * Імпортує спільні утиліти з appointmentUtils.js.
 */

import {
    getToken,
    fetchCurrentUserProfile,
    generateTimeSlots,
} from '../Utils/appointmentUtils.js';

const API_BASE_URL           = 'http://localhost:8081';
const SERVICE_DURATION_DEFAULT = 30;

let currentUserData      = null;
let currentServiceName   = null;
let currentServiceId     = null;
let currentServiceDuration = SERVICE_DURATION_DEFAULT;
let allServices          = [];

const modal                = document.getElementById('appointment-modal');
const closeBtn             = document.querySelector('.close-btn');
const appointmentForm      = document.getElementById('service-appointment-form');
const modalServiceName     = document.getElementById('modal-service-name');
const userNameInput        = document.getElementById('userName');
const userEmailInput       = document.getElementById('userEmail');
const formMessage          = document.getElementById('form-message');
const timeSlotsContainer   = document.getElementById('timeSlotsContainer');
const timeSelectionError   = document.getElementById('timeSelectionError');
const appointmentDateInput = document.getElementById('appointmentDate');
const appointmentTimeInput = document.getElementById('appointmentTime');
const submitAppointmentBtn = document.getElementById('submitAppointmentBtn');
const servicesContainer    = document.getElementById('services-container');
const serviceSearchInput   = document.getElementById('service-search-input');

function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    formMessage.textContent = '';
    if (submitAppointmentBtn) {
        submitAppointmentBtn.disabled    = false;
        submitAppointmentBtn.textContent = 'Підтвердити Запис';
    }
}

async function fetchBookedSlots(date) {
    if (!date || !currentServiceId) return [];
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/service-slots?idService=${currentServiceId}&date=${date}`
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.bookedSlots || [];
    } catch {
        return [];
    }
}

async function updateTimeSlots() {
    const date = appointmentDateInput?.value;

    if (currentServiceId && date) {
        timeSlotsContainer.innerHTML = '<p style="text-align:center;">Завантаження...</p>';
        const bookedSlots = await fetchBookedSlots(date);
        generateTimeSlots({
            container:  timeSlotsContainer,
            timeInput:  appointmentTimeInput,
            bookedSlots,
            duration:   currentServiceDuration,
        });
    } else {
        generateTimeSlots({
            container:  timeSlotsContainer,
            timeInput:  appointmentTimeInput,
            bookedSlots: [],
            duration:   currentServiceDuration,
        });
    }

    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

async function handleServiceAppointmentClick(event) {
    const btn = event.currentTarget;

    currentServiceName = btn.getAttribute('data-service-name');
    currentServiceId   = btn.getAttribute('data-service-id');

    const durationFromData = parseInt(btn.getAttribute('data-service-duration'));
    currentServiceDuration = (isNaN(durationFromData) || durationFromData <= 0)
        ? SERVICE_DURATION_DEFAULT
        : durationFromData;

    if (!modal || !appointmentForm) return;

    modalServiceName.textContent = `${currentServiceName} (${currentServiceDuration} хв)`;
    formMessage.textContent      = '';
    submitAppointmentBtn.textContent = 'Підтвердити Запис';

    if (!getToken()) {
        alert('Будь ласка, увійдіть або зареєструйтеся, щоб записатися на послугу.');
        return;
    }

    if (!currentUserData) {
        currentUserData = await fetchCurrentUserProfile(API_BASE_URL);
    }

    if (!currentUserData) {
        alert('Помилка: Не вдалося отримати дані профілю. Перевірте авторизацію.');
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

    if (!token || !currentUserData || !currentServiceId) {
        formMessage.textContent = 'Помилка: Необхідна авторизація або відсутні дані послуги.';
        formMessage.style.color = 'red';
        return;
    }

    const appointmentData = {
        idService:   currentServiceId,
        date:        appointmentDateInput.value,
        time:        appointmentTime,
        serviceName: currentServiceName,
        duration:    currentServiceDuration,
    };

    try {
        submitAppointmentBtn.disabled    = true;
        submitAppointmentBtn.textContent = 'Обробка...';
        formMessage.textContent          = 'Зачекайте, ваш запис обробляється...';
        formMessage.style.color          = 'orange';

        const response = await fetch(`${API_BASE_URL}/service-appointment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify(appointmentData),
        });

        const result = await response.json();

        if (response.ok && result.Success) {
            formMessage.textContent          = result.Message || 'Запис успішно створено!';
            formMessage.style.color          = 'green';
            await updateTimeSlots();
            submitAppointmentBtn.disabled    = false;
            submitAppointmentBtn.textContent = 'Підтвердити Запис';
            setTimeout(closeModal, 3000);
        } else {
            throw new Error(result.Error || 'Помилка запису на послугу. Спробуйте інший час.');
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

/**
 * Створює картку послуги.
 * CSS-класи: .service-card, .service-image-container, .service-info тощо
 * (замість старих .doctor-card, .doctor-image, що були семантично невірні).
 */
function createServiceCard(service) {
    const card = document.createElement('article');
    card.className = 'service-card';

    const formattedPrice  = parseFloat(service.price).toFixed(2).replace('.', ',');
    const imageUrl        = service.imageUrl
        ? `${API_BASE_URL}/images/${service.imageUrl}`
        : null;
    const serviceDuration = service.duration || SERVICE_DURATION_DEFAULT;

    card.innerHTML = `
        <div class="service-image-container">
            ${imageUrl
                ? `<img src="${imageUrl}" alt="Зображення послуги: ${service.name}" class="service-image" loading="lazy">`
                : `<div class="service-image-placeholder" aria-hidden="true"></div>`
            }
        </div>
        <div class="service-info">
            <h2 class="service-name">${service.name}</h2>
            <p class="service-category">Тривалість: <strong>${serviceDuration}</strong>&nbsp;хв</p>
            <p class="service-description">${service.description}</p>
            <div class="service-footer">
                <span class="service-price">Ціна: <strong>${formattedPrice}</strong>&nbsp;грн</span>
                <button class="appointment-btn"
                        data-service-name="${service.name}"
                        data-service-id="${service.idService}"
                        data-service-duration="${serviceDuration}">Записатися</button>
            </div>
        </div>
    `;

    card.querySelector('.appointment-btn').addEventListener('click', handleServiceAppointmentClick);
    return card;
}

function displayServices(services) {
    if (!servicesContainer) return;
    servicesContainer.innerHTML = '';

    if (services.length === 0) {
        servicesContainer.innerHTML = '<p class="info-message">На жаль, за вашим запитом послуг не знайдено.</p>';
        return;
    }

    services.forEach(service => servicesContainer.appendChild(createServiceCard(service)));
}

async function fetchServices() {
    if (!servicesContainer) return;
    try {
        const response = await fetch(`${API_BASE_URL}/services`);
        if (!response.ok) throw new Error(`HTTP помилка! Статус: ${response.status}`);

        const services = await response.json();
        if (services.Error) throw new Error(services.Error);

        allServices = services;
        displayServices(allServices);

        // SearchFilter.js — глобальна функція (non-module script, завантажується раніше)
        if (typeof window.initializeSearchFilter === 'function') {
            window.initializeSearchFilter(serviceSearchInput, allServices, displayServices);
        }
    } catch (error) {
        console.error('Помилка завантаження послуг:', error);
        if (servicesContainer) {
            servicesContainer.innerHTML = `<p class="error-message">Не вдалося завантажити дані послуг: ${error.message}.</p>`;
        }
    }
}

// Модуль є deferred — DOM вже готовий при виконанні
fetchServices();
fetchCurrentUserProfile(API_BASE_URL).then(userData => { currentUserData = userData; });

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