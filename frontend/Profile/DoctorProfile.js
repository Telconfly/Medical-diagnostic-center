window.initDoctorProfile = (user, profileForm) => {
    
    const apiUrl = window.apiUrl;
    const currentDoctorImageContainer = document.getElementById('current-doctor-image-container');

    document.getElementById('specialization').value = user.specialization || '';
    document.getElementById('price').value = user.price || '0.00'; 
    document.getElementById('experience').value = user.experience || '0'; 
    document.getElementById('doctorDescription').value = user.doctorDescription || '';
    
    if (currentDoctorImageContainer) {
        currentDoctorImageContainer.innerHTML = '';
        if (user.imageUrl) {
            const img = document.createElement('img');
            img.src = `${apiUrl}/images/${user.imageUrl}`; 
            img.alt = `Фото ${user.name}`;
            img.className = 'profile-doctor-image';
            currentDoctorImageContainer.appendChild(img);
        } else {    
            currentDoctorImageContainer.innerHTML = '<p id="no-image-text">Фото відсутнє</p>';
        }
    }

    profileForm.removeEventListener('submit', window.handleProfileUpdate); 
    profileForm.addEventListener('submit', window.handleDoctorProfileUpdate);
};


window.handleDoctorProfileUpdate = async (e) => {
    e.preventDefault();
    
    const apiUrl = window.apiUrl;
    const token = window.token;
    const displayMessage = window.displayMessage;

    const formData = new FormData();

    formData.append('name', document.getElementById('name').value);
    formData.append('phone', document.getElementById('phone').value); 
    formData.append('address', document.getElementById('address').value);
    formData.append('dateOfBirth', document.getElementById('dateOfBirth').value);
    formData.append('bio', document.getElementById('bio').value);

    formData.append('specialization', document.getElementById('specialization').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('experience', document.getElementById('experience').value);
    formData.append('doctorDescription', document.getElementById('doctorDescription').value);
    
    const imageInput = document.getElementById('doctorImage');
    if (imageInput && imageInput.files.length > 0) {
        formData.append('doctorImage', imageInput.files[0]);
    }

    try {
        const response = await fetch(`${apiUrl}/profile/update`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.Success) {
            displayMessage(data.Message, true);
            
            window.loadProfileData(); 
        } else {
            displayMessage(data.Error || "Помилка оновлення профілю.", false);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        displayMessage("Помилка підключення до сервера під час оновлення.", false);
    }
};