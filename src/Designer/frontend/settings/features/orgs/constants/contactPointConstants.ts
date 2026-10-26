export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A number with a country code (+ or 00), or a Norwegian mobile number that the backend gives +47
export const phoneRegex = /^(?:(?:\+|00)[1-9](?:[\s-]*\d){6,14}|[49](?:[\s-]*\d){7})$/;
export const emailPlaceholder = 'name@example.com';
export const phonePlaceholder = '+4712345678';
export const nameMaxLength = 100;
export const emailMaxLength = 254;
export const phoneMaxLength = 32;
export const emptyCellPlaceholder = '–';
