export const useValidation = (currentPage: number, validationRules: boolean[]) => {
  const isValid = validationRules[currentPage];

  console.log('isValid', isValid);
  console.log('currentPage', currentPage);
  console.log('validationRules[currentPage]', validationRules[currentPage]);

  return { isValid };
};

/*
 const { isValid } = useValidation(currentPage, [
  // Valideringsregel: første side krever at input-feltet er fylt ut
  (page) => (page === 0 ? inputValue.trim() !== "" : true),
 ]);
 */
