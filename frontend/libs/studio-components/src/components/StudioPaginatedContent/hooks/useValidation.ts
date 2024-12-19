export const useValidation = (currentPage: number, validationRules: boolean[]) => {
  const isValid = validationRules[currentPage];
  return { isValid };
};
