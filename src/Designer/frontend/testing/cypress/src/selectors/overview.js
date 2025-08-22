export const overview = {
  getHeader: (appName) => cy.findByRole('heading', { name: appName }),
};
