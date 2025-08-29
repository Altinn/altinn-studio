export const login = {
  getLoginButton: () => cy.findByRole('button', { name: /logg inn/i }),
};
