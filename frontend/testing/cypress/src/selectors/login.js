export const login = {
  getCreateUserLink: () => cy.findByRole('link', { name: 'Opprett ny bruker' }),
  getLanguageMenu: () => cy.findByRole('menu'),
  getLanguageMenuItem: (language) => cy.findByRole('menuitem', { name: language }),
  getLoginButton: () => cy.findByRole('button', { name: 'Logg inn' }),
  getLoginErrorMessage: () => cy.findByText('Ugyldig brukernavn eller passord.'),
  getPasswordField: () => cy.findByLabelText('Passord'),
  getUsernameField: () => cy.findByLabelText('Brukernavn eller epost'),
};
