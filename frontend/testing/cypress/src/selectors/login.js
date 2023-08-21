export const login = {
  getCreateUserLink: () => cy.findByRole('link', { name: 'Opprett ny bruker' }),
  getLoginButton: () => cy.findByRole('button', { name: 'Logg inn' }),
  getLoginErrorMessage: () => cy.findByText('Ugyldig brukernavn eller passord.'),
  getPasswordField: () => cy.findByLabelText('Passord'),
  getUsernameField: () => cy.findByLabelText('Brukernavn eller epost'),
};
