const API_BASE_URL = 'http://localhost:8081';
const SERVICE_DURATION_DEFAULT = 30;
const TIME_SLOT_INTERVAL = 30;
const WORK_START_HOUR = 10;
const WORK_END_HOUR = 15;

let currentUserData = null;
let currentServiceName = null;
let currentServiceId = null;
let currentServiceDuration = SERVICE_DURATION_DEFAULT; 
let allServices = [];

const DOMElements = {
    modal: document.getElementById('appointment-modal'),
    closeBtn: document.querySelector('.close-btn'),
    appointmentForm: document.getElementById('service-appointment-form'),
    modalServiceName: document.getElementById('modal-service-name'),
    userNameInput: document.getElementById('userName'),
    userEmailInput: document.getElementById('userEmail'),
    formMessage: document.getElementById('form-message'),
    timeSlotsContainer: document.getElementById('timeSlotsContainer'),
    timeSelectionError: document.getElementById('timeSelectionError'),
    appointmentDateInput: document.getElementById('appointmentDate'),
    appointmentTimeInput: document.getElementById('appointmentTime'),
    submitAppointmentBtn: document.getElementById('submitAppointmentBtn'),
    servicesContainer: document.getElementById('services-container'),
    serviceSearchInput: document.getElementById('service-search-input'),
};

const {
    modal, closeBtn, appointmentForm, modalServiceName, userNameInput,
    userEmailInput, formMessage, timeSlotsContainer, timeSelectionError,
    appointmentDateInput, appointmentTimeInput, submitAppointmentBtn,
    servicesContainer, serviceSearchInput
} = DOMElements;

function getToken() {
    return localStorage.getItem('token');
}

function closeModal() {
    if (modal) {
        modal.style.display = "none";
        formMessage.textContent = '';
        if (submitAppointmentBtn) {
            submitAppointmentBtn.disabled = false;
            submitAppointmentBtn.textContent = 'Підтвердити Запис';
        }
    }
}

function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function intervalsOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2; 
}

async function fetchCurrentUserProfile() {
    const token = getToken();
    if (!token) {
        currentUserData = null;
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        currentUserData = (response.ok && data.Success && data.user) ? data.user : null;
        return currentUserData;
    } catch (error) {
        console.error("Помилка fetchCurrentUserProfile:", error);
        currentUserData = null;
        return null;
    }
}

async function fetchBookedSlots(date) {
    if (!date || !currentServiceId) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/api/service-slots?idService=${currentServiceId}&date=${date}`);
        if (!response.ok) {
            console.error('Failed to fetch booked slots. Status:', response.status);
            return [];
        }
        const data = await response.json();
        return data.bookedSlots || [];
    } catch (error) {
        console.error("Помилка отримання заброньованих слотів:", error);
        return [];
    }
}

function handleTimeSlotClick(event) {
    const selectedTime = event.target.getAttribute('data-time');

    document.querySelectorAll('.time-slot-btn.selected').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    appointmentTimeInput.value = selectedTime;
    
    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

function generateTimeSlots(bookedSlots = []) {
    if (!timeSlotsContainer || !appointmentTimeInput) return;

    timeSlotsContainer.innerHTML = '';
    appointmentTimeInput.value = '';

    const endOfDayMinutes = WORK_END_HOUR * 60;
    const maxStartMinutes = endOfDayMinutes - currentServiceDuration; 

    const bookedIntervals = bookedSlots.map(slot => ({
        time: slot.time,
        start: timeToMinutes(slot.time),
        end: timeToMinutes(slot.time) + (slot.duration || SERVICE_DURATION_DEFAULT)
    }));

    for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        for (let m = 0; m < 60; m += TIME_SLOT_INTERVAL) {
            const slotStartMinutes = h * 60 + m;
            
            if (slotStartMinutes > maxStartMinutes) continue;
            
            const slotEndMinutes = slotStartMinutes + currentServiceDuration;
            if (slotEndMinutes > endOfDayMinutes) continue;
            
            const timeValue = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            
            let isBooked = bookedIntervals.some(booked => 
                intervalsOverlap(slotStartMinutes, slotEndMinutes, booked.start, booked.end)
            );

            const button = document.createElement('button');
            button.className = 'time-slot-btn';
            button.type = 'button';
            button.textContent = timeValue;
            button.setAttribute('data-time', timeValue);
            
            if (isBooked) {
                button.disabled = true;
                const blockedInterval = bookedIntervals.find(booked =>
                    intervalsOverlap(slotStartMinutes, slotEndMinutes, booked.start, booked.end)
                );
                button.title = blockedInterval ? 
                    `Зайнято. Конфлікт з записом о ${blockedInterval.time}` : 'Зайнято';
            } else {
                button.addEventListener('click', handleTimeSlotClick);
            }
            
            timeSlotsContainer.appendChild(button);
        }
    }
    
    if (timeSlotsContainer.childElementCount === 0) {
        timeSlotsContainer.innerHTML = '<p style="text-align:center; color: red; font-weight: 500;">На обрану дату вільних слотів немає.</p>';
    }
}

async function updateTimeSlots() {
    const appointmentDate = appointmentDateInput.value;
    
    if (currentServiceId && appointmentDate) {
        timeSlotsContainer.innerHTML = '<p style="text-align:center;">Завантаження...</p>';
        const bookedSlots = await fetchBookedSlots(appointmentDate);
        generateTimeSlots(bookedSlots);
    } else {
        generateTimeSlots([]);
    }
    
    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

async function handleServiceAppointmentClick(event) {
    const btn = event.target;
    currentServiceName = btn.getAttribute('data-service-name');
    currentServiceId = btn.getAttribute('data-service-id');
    
    const durationFromData = parseInt(btn.getAttribute('data-service-duration'));
    currentServiceDuration = (isNaN(durationFromData) || durationFromData <= 0) 
        ? SERVICE_DURATION_DEFAULT 
        : durationFromData; 

    if (!modal || !appointmentForm) return;

    modalServiceName.textContent = `${currentServiceName} (${currentServiceDuration} хв)`;
    formMessage.textContent = '';
    submitAppointmentBtn.textContent = 'Підтвердити Запис';

    if (!getToken()) {
        alert('Будь ласка, увійдіть або зареєструйтеся, щоб записатися на послугу.');
        return;
    }
    
    if (!currentUserData && !(await fetchCurrentUserProfile())) {
        alert('Помилка: Не вдалося отримати дані профілю. Перевірте авторизацію.');
        return;
    }

    if (currentUserData) {
        userNameInput.value = currentUserData.name || '';
        userEmailInput.value = currentUserData.email || '';
        
        const today = new Date().toISOString().split('T')[0];
        appointmentDateInput.setAttribute('min', today);
        
        if (!appointmentDateInput.value || appointmentDateInput.value < today) {
            appointmentDateInput.value = today;
        }

        await updateTimeSlots();
        modal.style.display = "block";
    }
}

async function handleAppointmentFormSubmit(event) {
    event.preventDefault();
    
    const token = getToken();
    const appointmentTime = appointmentTimeInput.value;

    if (!appointmentTime) {
        if (timeSelectionError) {
            timeSelectionError.textContent = 'Будь ласка, оберіть час прийому.';
            timeSelectionError.style.display = 'block';
        }
        return;
    } else {
        timeSelectionError.style.display = 'none';
    }

    if (!token || !currentUserData || !currentServiceId) {
        formMessage.textContent = 'Помилка: Необхідна авторизація або відсутні дані послуги.';
        formMessage.style.color = 'red';
        return;
    }

    const appointmentData = {
        idService: currentServiceId,
        date: appointmentDateInput.value,
        time: appointmentTime,
        serviceName: currentServiceName,
        duration: currentServiceDuration
    };
    
    try {
        submitAppointmentBtn.disabled = true;
        submitAppointmentBtn.textContent = 'Обробка...';
        formMessage.textContent = 'Зачекайте, ваш запис обробляється...';
        formMessage.style.color = 'orange';

        const response = await fetch(`${API_BASE_URL}/service-appointment`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });

        const result = await response.json();
        
        if (response.ok && result.Success) {
            formMessage.textContent = ` ${result.Message || 'Запис успішно створено!'}`;
            formMessage.style.color = 'green';
            await updateTimeSlots();
            submitAppointmentBtn.disabled = false;
            submitAppointmentBtn.textContent = 'Підтвердити Запис';
            setTimeout(closeModal, 3000);
        } else {
            const errorMsg = result.Error || 'Помилка запису на послугу. Спробуйте інший час.';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error("Помилка відправки запису:", error);
        submitAppointmentBtn.disabled = false;
        submitAppointmentBtn.textContent = 'Підтвердити Запис';
        formMessage.textContent = ` Помилка: ${error.message}`;
        formMessage.style.color = 'red';
        await updateTimeSlots();
    }
}

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    
    const formattedPrice = parseFloat(service.price).toFixed(2).replace('.', ',');
    
    const imageUrl = service.imageUrl ? `${API_BASE_URL}/images/${service.imageUrl}` : '../images/placeholder.jpg';
    
    const serviceDuration = service.duration || SERVICE_DURATION_DEFAULT;

    card.innerHTML = `
        <div class="doctor-image-container">
            <img src="${imageUrl}" alt="Зображення послуги: ${service.name}" class="doctor-image">
        </div>
        <div class="doctor-info">
            <h2 class="doctor-name">${service.name}</h2>
            <p class="doctor-specialization">Тривалість: <strong>${serviceDuration}</strong> хв</p>
            <p class="doctor-description">${service.description}</p>
            <div class="doctor-footer">
                <span class="doctor-price">Ціна: <strong>${formattedPrice}</strong> грн</span>
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

    services.forEach(service => {
        servicesContainer.appendChild(createServiceCard(service));
    });
}

async function fetchServices() {
    try {
        if (!servicesContainer) return;

        const response = await fetch(`${API_BASE_URL}/services`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const services = await response.json();
        if (services.Error) throw new Error(services.Error);

        allServices = services; 
        
        displayServices(allServices); 

        if (typeof initializeSearchFilter === 'function') {
            initializeSearchFilter(serviceSearchInput, allServices, displayServices);
        } else {
            console.error('Помилка: Функція initializeSearchFilter не знайдена. Перевірте підключення SearchFilter.js');
        }

    } catch (error) {
        console.error("Помилка завантаження послуг:", error);
        if (servicesContainer) {
            servicesContainer.innerHTML = `<p class="error-message">Не вдалося завантажити дані послуг: ${error.message}.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchServices();
    fetchCurrentUserProfile();

    if (closeBtn) closeBtn.onclick = closeModal;

    if (modal) {
        window.onclick = (event) => {
            if (event.target === modal) closeModal();
        };
    }
    
    if (appointmentDateInput) {
        appointmentDateInput.addEventListener('change', updateTimeSlots);
    }

    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentFormSubmit);
    }
});