const API_BASE_URL = 'http://localhost:8081';
const APPOINTMENT_DURATION_MINUTES = 30; 
const WORK_START_HOUR = 10;
const WORK_END_HOUR = 15;
const TIME_SLOT_INTERVAL = 30; 

let currentUserData = null; 
let currentDoctorName = null; 
let currentDoctorId = null; 

const DOMElements = {
    modal: document.getElementById('appointment-modal'),
    closeBtn: document.querySelector('.close-btn'),
    appointmentForm: document.getElementById('appointment-form'),
    modalDoctorName: document.getElementById('modal-doctor-name'),
    userNameInput: document.getElementById('userName'),
    userEmailInput: document.getElementById('userEmail'),
    formMessage: document.getElementById('form-message'),
    timeSlotsContainer: document.getElementById('timeSlotsContainer'),
    timeSelectionError: document.getElementById('timeSelectionError'),
    appointmentDateInput: document.getElementById('appointmentDate'),
    appointmentTimeInput: document.getElementById('appointmentTime'),
    submitAppointmentBtn: document.getElementById('submitAppointmentBtn'),
};

const {
    modal, closeBtn, appointmentForm, modalDoctorName, userNameInput,
    userEmailInput, formMessage, timeSlotsContainer, timeSelectionError,
    appointmentDateInput, appointmentTimeInput, submitAppointmentBtn,
} = DOMElements;


function getToken() {
    return localStorage.getItem('token'); 
}

function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function intervalsOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
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

async function fetchCurrentUserProfile() {
    const token = getToken();
    if (!token) return null; 

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
        return null;
    }
}

async function fetchBookedSlots(doctorId, date) {
    if (!doctorId || !date) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/api/doctor-slots?idDoctor=${doctorId}&date=${date}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch booked slots');
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

    document.querySelectorAll('.time-slot-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    appointmentTimeInput.value = selectedTime;
    
    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

function generateTimeSlots(bookedSlots = []) {
    if (!timeSlotsContainer || !appointmentTimeInput) return;

    timeSlotsContainer.innerHTML = '';
    appointmentTimeInput.value = '';

    const endOfDayMinutes = WORK_END_HOUR * 60;
    const maxStartMinutes = endOfDayMinutes - APPOINTMENT_DURATION_MINUTES;

    const bookedIntervals = bookedSlots.map(slot => ({
        time: slot.time,
        start: timeToMinutes(slot.time),
        end: timeToMinutes(slot.time) + (slot.duration || APPOINTMENT_DURATION_MINUTES) 
    }));

    for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        for (let m = 0; m < 60; m += TIME_SLOT_INTERVAL) {
            const slotStartMinutes = h * 60 + m;
            
            if (slotStartMinutes > maxStartMinutes) continue;
            
            const slotEndMinutes = slotStartMinutes + APPOINTMENT_DURATION_MINUTES;
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
    
    if (currentDoctorId && appointmentDate) {
        timeSlotsContainer.innerHTML = '<p style="text-align:center;">Завантаження...</p>';
        
        const bookedSlots = await fetchBookedSlots(currentDoctorId, appointmentDate);
        generateTimeSlots(bookedSlots);
    } else {
        generateTimeSlots([]);
    }
    
    if (timeSelectionError) timeSelectionError.style.display = 'none';
}

export async function openAppointmentModal(doctorName, doctorId) {
    if (!modal || !appointmentForm) return;

    currentDoctorName = doctorName;
    currentDoctorId = doctorId;
    
    submitAppointmentBtn.textContent = 'Підтвердити Запис';
    modalDoctorName.textContent = currentDoctorName;
    formMessage.textContent = ''; 
    
    if (!getToken()) {
        alert('Будь ласка, увійдіть або зареєструйтеся, щоб записатися на прийом.');
        return;
    }
    
    if (!currentUserData) {
        await fetchCurrentUserProfile();
    }

    if (currentUserData) {
        if (currentUserData.role === 'Doctor' && String(currentUserData.id) === currentDoctorId) {
            alert('Ви не можете записатися на консультацію до самого себе.');
            return; 
        }

        userNameInput.value = currentUserData.name || '';
        userEmailInput.value = currentUserData.email || '';
        
        const today = new Date().toISOString().split('T')[0];
        appointmentDateInput.setAttribute('min', today);
        if (!appointmentDateInput.value || appointmentDateInput.value < today) {
            appointmentDateInput.value = today; 
        }

        await updateTimeSlots(); 
        modal.style.display = "block";
    } else {
        alert('Не вдалося отримати дані вашого профілю. Спробуйте увійти знову.');
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

    if (!token || !currentUserData || !currentDoctorId) { 
        formMessage.textContent = 'Помилка: Необхідна авторизація або відсутні дані лікаря.';
        formMessage.style.color = 'red';
        return;
    }

    const appointmentData = {
        idDoctor: currentDoctorId, 
        date: appointmentDateInput.value,
        time: appointmentTime,
        doctorName: currentDoctorName,
        duration: APPOINTMENT_DURATION_MINUTES 
    };
    
    try {
        submitAppointmentBtn.disabled = true;
        submitAppointmentBtn.textContent = 'Обробка...';
        formMessage.textContent = 'Зачекайте, ваш запис обробляється...';
        formMessage.style.color = 'orange';

        const response = await fetch(`${API_BASE_URL}/appointment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        const result = await response.json();
        
        if (response.ok && result.Success) {
            formMessage.textContent = ` Успішно записано до лікаря ${currentDoctorName} на ${appointmentData.date} о ${appointmentData.time}!`;
            formMessage.style.color = 'green';
            
            await updateTimeSlots(); 
            
            submitAppointmentBtn.disabled = false;
            submitAppointmentBtn.textContent = 'Підтвердити Запис';
            setTimeout(closeModal, 3000);
        } else {
            throw new Error(result.Error || 'Помилка запису на прийом');
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

export function initializeAppointmentListeners() {
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
}