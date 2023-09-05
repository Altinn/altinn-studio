const getDeleteRepositoryModal = () => cy.get('#delete-repo-modal');

export const gitea = {
  getAltinnLogo: () => cy.findByAltText(/altinn(|-| )logo/i),
  getConfirmDeletionButton: () => getDeleteRepositoryModal().findByRole('button', { name: /confirm deletion/i }),
  getDeleteButton: () => cy.findByRole('button', { name: /delete this repository/i }),
  getDeleteRepositoryModal,
  getDeleteRepositoryNameField: () => cy.get('#delete-repo-modal #repo_name'),
  getLanguageMenu: () => cy.findByRole('menu'),
  getLanguageMenuItem: (language) => cy.findByRole('menuitem', { name: language }),
  getLoginButton: () => cy.findByRole('button', { name: /logg inn/i }),
  getLoginErrorMessage: () => cy.findByText(/ugyldig brukernavn eller passord./i),
  getPasswordField: () => cy.findByLabelText(/passord/i),
  getRepositoryHeader: () => cy.findByRole('heading', { level: 1 }),
  getUsernameField: () => cy.findByLabelText(/brukernavn eller epost/i),
};
