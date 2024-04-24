export const getLabelSize = (size: string) => {
  let labelSize;
  switch (size) {
    case 'xsmall':
      labelSize = 'xsmall';
      break;
    case 'small':
      labelSize = 'xsmall';
      break;
    case 'large':
      labelSize = 'medium';
      break;
    default:
      labelSize = 'small';
  }

  return labelSize;
};

export const calcCurrentRows = (currentPage, rowPerPage, rows) => {
  const startIndex = (currentPage - 1) * rowPerPage;
  const endIndex = startIndex + rowPerPage;
  return rows.slice(startIndex, endIndex);
};
