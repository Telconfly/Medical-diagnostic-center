function loadHeader(containerId, headerPath, currentPage, callback) {
    fetch(headerPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Не вдалося завантажити хедер. Статус: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const container = document.getElementById(containerId);
            if (container) {
                
                container.innerHTML = data;

                
                const navItems = container.querySelectorAll('.nav-item');
                navItems.forEach(item => {
                    if (item.textContent.trim() === currentPage) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });

                
                const adminButton = document.getElementById('admin-button');
                if (adminButton && currentPage === 'Адмін') {
                    adminButton.classList.add('active'); 
                }


                
                if (window.initAuthUI) {
                    window.initAuthUI();
                    
                    
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                } else {
                    console.error("loadHeader.js [ERROR]: Функція initAuthUI (з auth.js) не знайдена. Перевірка доступу не буде працювати коректно.");
                }

            } else {
                console.error(`Елемент-контейнер з ID '${containerId}' не знайдено.`);
            }
        })
        .catch(error => {
            console.error('Помилка при завантаженні або обробці хедера:', error);
        });
}


window.loadHeader = loadHeader;