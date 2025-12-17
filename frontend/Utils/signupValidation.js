export function validateSignup(name, email, password) {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const nameOnlyLettersRegex = /^[A-Za-zА-Яа-яЄєІіЇї\s]+$/;

    const nameTrimmed = name.trim();
    const nameParts = nameTrimmed.split(/\s+/).filter(part => part.length > 0);

    if (!nameTrimmed) {
        errors.name = "П.І.Б. є обов'язковим.";
    } else if (!nameOnlyLettersRegex.test(nameTrimmed)) {
        errors.name = "Ім'я не може містити цифри або спеціальні символи.";
    } else if (nameParts.length !== 3) {
        errors.name = "Введіть повне П.І.Б. (наприклад: Олійник Василь Іванович).";
    } else if (nameTrimmed.length < 5) {
         errors.name = "Занадто коротке П.І.Б.";
    }

    if (!email.trim()) {
        errors.email = "Email є обов'язковим.";
    } else if (!emailRegex.test(email)) {
        errors.email = "Введіть дійсний Email.";
    }

    if (password.length < 6) {
        errors.password = "Пароль має бути не менше 6 символів.";
    }

    return errors;
}