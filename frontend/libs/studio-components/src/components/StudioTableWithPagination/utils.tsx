export const labelSizeMap = {
  small: 'xsmall',
  medium: 'small',
  large: 'medium',
};

export const calcCurrentRows = (currentPage, rowPerPage, rows) => {
  const startIndex = (currentPage - 1) * rowPerPage;
  const endIndex = startIndex + rowPerPage;
  return rows.slice(startIndex, endIndex);
};
