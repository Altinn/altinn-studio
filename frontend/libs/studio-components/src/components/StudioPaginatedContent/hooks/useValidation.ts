export const useValidation = (currentPage: number, validationRules: boolean[]) => {
  const isValid = validationRules[currentPage];

  console.log('isValid', isValid);
  console.log('currentPage', currentPage);
  console.log('validationRules[currentPage]', validationRules[currentPage]);

  return { isValid };
};
