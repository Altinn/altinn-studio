/// <reference types='cypress' />

const baseUrl = Cypress.env('localTestBaseUrl');

/**
 * Get AltinnStudioRuntime token for an org
 */
Cypress.Commands.add('getTokenForOrg', (orgName) => {
  var token;
  cy.request('GET', baseUrl + 'Home/GetTestOrgToken/' + orgName).then((response) => {
    token = response.body;
    return cy.wrap(token);
  });
});
