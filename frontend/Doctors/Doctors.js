

import { initializeFilter } from './DoctorsFilter.js';
import { initializeAppointmentListeners, openAppointmentModal } from './AppointmentDoctor.js';


const API_BASE_URL = 'http://localhost:8081';
const APPOINTMENT_DURATION_MINUTES = 30; 

const DOMElements = {
    doctorsContainer: document.getElementById('doctors-container'),
};

const { doctorsContainer } = DOMElements;


function getDoctorImagePath(imageName) {
    return `${API_BASE_URL}/images/${imageName}`;
}

function createDoctorCard(doctor) {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    
    const formattedPrice = parseFloat(doctor.price).toFixed(2).replace('.', ',');
    const imagePath = getDoctorImagePath(doctor.imageUrl);

    card.innerHTML = `
        <div class="doctor-image-container">
            <img src="${imagePath}" alt="Фото ${doctor.fullName}" class="doctor-image">
        </div>
        <div class="doctor-info">
            <h2 class="doctor-name">${doctor.fullName}</h2>
            <p class="doctor-specialization">${doctor.specialization} (Прийом: ${APPOINTMENT_DURATION_MINUTES} хв)</p>
            <p class="doctor-experience">Досвід: <strong>${doctor.experience}</strong> років</p>
            <p class="doctor-description">${doctor.description}</p>
            <div class="doctor-footer">
                <span class="doctor-price">Ціна консультації: <strong>${formattedPrice}</strong> грн</span>
                <button class="appointment-btn" 
                        data-doctor-name="${doctor.fullName}" 
                        data-doctor-id="${doctor.idDoctor}">
                    Записатися
                </button>
            
            </div>
        </div>
    `;
    
    card.querySelector('.appointment-btn').addEventListener('click', (event) => {
        const name = event.target.getAttribute('data-doctor-name');
        const id = event.target.getAttribute('data-doctor-id');
        openAppointmentModal(name, id);
    });
    
    return card;
}


export function displayDoctors(doctors) {
    if (!doctorsContainer) return;

    doctorsContainer.innerHTML = ''; 

    if (doctors.length === 0) {
        doctorsContainer.innerHTML = '<p class="info-message no-doctors">Наразі немає доступних лікарів за вашим запитом.</p>';
        return;
    }

    doctors.forEach(doctor => {
        doctorsContainer.appendChild(createDoctorCard(doctor));
    });
}

async function fetchDoctors() {
    try {
        if (!doctorsContainer) return;

        doctorsContainer.innerHTML = '<p class="info-message">Завантаження даних лікарів...</p>';

        const response = await fetch(`${API_BASE_URL}/doctors`); 

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const doctors = await response.json();
        if (doctors.Error) throw new Error(doctors.Error);

        initializeFilter(doctors, displayDoctors);

    } catch (error) {
        console.error("Помилка завантаження лікарів:", error);
        if(doctorsContainer) {
            doctorsContainer.innerHTML = `<p class="error-message">Не вдалося завантажити дані лікарів: ${error.message}.</p>`;
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    fetchDoctors();
    initializeAppointmentListeners(); 
});