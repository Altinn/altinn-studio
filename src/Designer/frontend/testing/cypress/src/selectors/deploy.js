export const deploy = {
  getDeployHistoryTable: (environment) => {
    switch (environment) {
      case 'at22':
        return cy.get('#deploy-history-table-at22');
      case 'prod':
        return cy.get('#deploy-history-table-production');
      default:
        return;
    }
  },
};
