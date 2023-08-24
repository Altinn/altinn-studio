export const login = {
  getCreateUserLink: () =>
    cy.findByRole("link", { name: /opprett ny bruker/i }),
  getLoginButton: () => cy.findByRole("button", { name: /logg inn/i }),
};
