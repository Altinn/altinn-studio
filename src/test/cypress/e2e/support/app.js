/// <reference types='cypress' />

const baseUrl = Cypress.env('localTestBaseUrl');

/**
 * Upload attachment to an app instance
 */
Cypress.Commands.add('uploadAttachment', (orgName, appName, partyId, instanceId, attachmentId, token) => {
  cy.getCookie('AltinnStudioRuntime').then((value) => {
    cy.clearCookie('AltinnStudioRuntime').then(() => {
      cy.request({
        method: 'POST',
        url: baseUrl + orgName + '/' + appName + '/instances/' + partyId + '/' + instanceId + '/data?dataType=' + attachmentId,
        headers: {
          'Content-Disposition': 'attachment; filename=test.txt',
          'Content-Type': 'application/octet-stream',
          'Authorization': 'Bearer ' + token
        },
        body: 'test'
      }).then(() => cy.setCookie(value.name, value.value));
    });
  });
});
