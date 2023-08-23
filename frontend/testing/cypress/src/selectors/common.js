export const common = {
  getCellByColumnHeader: (table, row, name) => cy
    .get(table)
    .findByRole('columnheader', { name })
    .invoke('index')
    .then((i) => {
      return cy
        .get(row)
        .findAllByRole('cell')
        .eq(i);
    })
}
