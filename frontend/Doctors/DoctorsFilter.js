const specializationFilter = document.getElementById('specialization-filter');
const searchInput = document.getElementById('doctor-search-input');

let allDoctors = [];
let displayDoctorsCallback = () => {};


function populateSpecializationFilter(doctors) {
    if (!specializationFilter) return;

    const specializations = new Set(doctors.map(d => d.specialization).filter(Boolean));
    
    specializationFilter.innerHTML = '<option value="">Всі спеціальності</option>'; 
    
    [...specializations].sort().forEach(spec => {
        const option = document.createElement('option');
        option.value = spec;
        option.textContent = spec;
        specializationFilter.appendChild(option);
    });
}

export function filterDoctors() {
    const selectedSpecialization = specializationFilter ? specializationFilter.value : '';
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = allDoctors;

    if (selectedSpecialization) {
        filtered = filtered.filter(doctor => doctor.specialization === selectedSpecialization);
    }

    if (searchText) {
        filtered = filtered.filter(doctor => 
            doctor.fullName.toLowerCase().includes(searchText)
        );
    }

    displayDoctorsCallback(filtered);
}


export function initializeFilter(doctors, displayCallback) {
    allDoctors = doctors;
    displayDoctorsCallback = displayCallback;
    
    populateSpecializationFilter(allDoctors);
    
    displayDoctorsCallback(allDoctors);

    if (specializationFilter) {
        specializationFilter.addEventListener('change', filterDoctors);
    }
    if (searchInput) {
        searchInput.addEventListener('input', filterDoctors); 
    }
}