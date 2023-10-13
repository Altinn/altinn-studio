export const isValidDate = (dateVal: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateVal);
};

export const isValidTime = (timeVal: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  return timeRegex.test(timeVal);
};
