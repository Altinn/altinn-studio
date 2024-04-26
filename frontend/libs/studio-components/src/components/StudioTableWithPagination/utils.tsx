export const labelSizeMap = {
  small: 'xsmall',
  medium: 'small',
  large: 'medium',
};

export const calcRowsToRender = (currentPage, rowsPerPage, rows) => {
  if (rowsPerPage === 0) return rows;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  return rows.slice(startIndex, endIndex);
};
