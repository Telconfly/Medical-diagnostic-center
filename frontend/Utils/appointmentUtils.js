/**
 * Спільні утиліти для функціоналу запису на прийом (до лікаря та послуги).
 * Підключається як ES-модуль у AppointmentDoctor.js та Services.js.
 */

export const WORK_START_HOUR     = 10;
export const WORK_END_HOUR       = 15;
export const TIME_SLOT_INTERVAL  = 30; // хвилин

/**
 * Отримує JWT-токен з localStorage.
 * @returns {string|null}
 */
export function getToken() {
    return localStorage.getItem('token');
}

/**
 * Конвертує рядок часу "HH:MM" у кількість хвилин від початку доби.
 * @param {string} time
 * @returns {number}
 */
export function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Перевіряє перетин двох часових інтервалів (open-ended overlap).
 * @param {number} start1
 * @param {number} end1
 * @param {number} start2
 * @param {number} end2
 * @returns {boolean}
 */
export function intervalsOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
}

/**
 * Завантажує дані профілю поточного авторизованого користувача.
 * @param {string} apiBaseUrl
 * @returns {Promise<object|null>} Об'єкт користувача або null при помилці/відсутності токена.
 */
export async function fetchCurrentUserProfile(apiBaseUrl) {
    const token = getToken();
    if (!token) return null;

    try {
        const response = await fetch(`${apiBaseUrl}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        return (response.ok && data.Success && data.user) ? data.user : null;
    } catch {
        return null;
    }
}

/**
 * Генерує та відображає кнопки доступних часових слотів у контейнері.
 *
 * @param {object} options
 * @param {HTMLElement}      options.container    - Контейнер для слотів
 * @param {HTMLInputElement} options.timeInput    - Прихований input для збереження обраного часу
 * @param {Array}            [options.bookedSlots=[]] - Масив зайнятих слотів [{time, duration}]
 * @param {number}           options.duration     - Тривалість прийому (хвилин)
 * @param {function}         [options.onSlotSelect] - Callback при виборі слоту (отримує рядок часу)
 */
export function generateTimeSlots({ container, timeInput, bookedSlots = [], duration, onSlotSelect } = {}) {
    if (!container || !timeInput) return;

    container.innerHTML = '';
    timeInput.value = '';

    const endOfDayMinutes    = WORK_END_HOUR * 60;
    const maxStartMinutes    = endOfDayMinutes - duration;

    const bookedIntervals = bookedSlots.map(slot => ({
        time:  slot.time,
        start: timeToMinutes(slot.time),
        end:   timeToMinutes(slot.time) + (slot.duration || duration),
    }));

    let slotCount = 0;

    for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        for (let m = 0; m < 60; m += TIME_SLOT_INTERVAL) {
            const slotStartMinutes = h * 60 + m;
            if (slotStartMinutes > maxStartMinutes) continue;

            const slotEndMinutes = slotStartMinutes + duration;
            if (slotEndMinutes > endOfDayMinutes) continue;

            const timeValue = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const isBooked  = bookedIntervals.some(booked =>
                intervalsOverlap(slotStartMinutes, slotEndMinutes, booked.start, booked.end)
            );

            const button = document.createElement('button');
            button.className = 'time-slot-btn';
            button.type = 'button';
            button.textContent = timeValue;
            button.setAttribute('data-time', timeValue);

            if (isBooked) {
                button.disabled = true;
                const conflict = bookedIntervals.find(b =>
                    intervalsOverlap(slotStartMinutes, slotEndMinutes, b.start, b.end)
                );
                button.title = conflict
                    ? `Зайнято. Конфлікт з записом о ${conflict.time}`
                    : 'Зайнято';
            } else {
                button.addEventListener('click', () => {
                    container.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                    button.classList.add('selected');
                    timeInput.value = timeValue;
                    if (typeof onSlotSelect === 'function') onSlotSelect(timeValue);
                });
            }

            container.appendChild(button);
            slotCount++;
        }
    }

    if (slotCount === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--color-error); font-weight: 500; margin: 0;">На обрану дату вільних слотів немає.</p>';
    }
}
