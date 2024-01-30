export const gitea = {
  getPasswordField: () => cy.findByLabelText(/passord/i),
  getRepositoryHeader: () => cy.findByRole('heading', { level: 1 }),
  getUsernameField: () => cy.findByLabelText(/brukernavn eller epost/i),
};
