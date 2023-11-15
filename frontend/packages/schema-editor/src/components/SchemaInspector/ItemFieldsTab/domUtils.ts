export const nameFieldClass = 'object-name-field';

export const getLastNameField = (): HTMLInputElement | null => {
  const fields = document.getElementsByClassName(nameFieldClass);
  const numberOfFields = fields.length;
  if (!numberOfFields) return null;
  const indexOfLastField = numberOfFields - 1;
  const fieldWrapper = fields[indexOfLastField];
  return fieldWrapper.getElementsByTagName('input')[0];
};
