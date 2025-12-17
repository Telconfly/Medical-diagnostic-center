function initializeSearchFilter(searchInput, allServices, displayServicesCallback) {
    if (!searchInput || !allServices || typeof displayServicesCallback !== 'function') {
        console.error('Не вдалося ініціалізувати фільтр: відсутні необхідні параметри.');
        return;
    }

    let timeoutId = null;
    const debounceDelay = 300;

    function filterServices() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();

            if (searchTerm.length === 0) {
                displayServicesCallback(allServices);
                return;
            }

            const filteredServices = allServices.filter(service => {
                const nameMatch = service.name ? service.name.toLowerCase().includes(searchTerm) : false;
                const descriptionMatch = service.description ? service.description.toLowerCase().includes(searchTerm) : false;
                
                return nameMatch || descriptionMatch;
            });

            displayServicesCallback(filteredServices);
        }, debounceDelay);
    }

    searchInput.addEventListener('input', filterServices);

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
        }
    });
    
    console.log('Пошуковий фільтр успішно ініціалізовано.');
}
window.initializeSearchFilter = initializeSearchFilter;