export function validateLogin(email, password) {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
        errors.email = "Email є обов'язковим.";
    } else if (!emailRegex.test(email)) {
        errors.email = "Введіть дійсний Email.";
    }

    if (password.length === 0) {
        errors.password = "Пароль є обов'язковим.";
    }

    return errors;
}