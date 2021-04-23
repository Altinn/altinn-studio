/// <reference types="cypress" />

const giteaBaseUrl = Cypress.config().baseUrl + '/repos/api/v1/';

/**
 * create an org with org name, authenticated using access token
 */
Cypress.Commands.add('createorg', (orgName, accessToken) => {
  cy.request('POST', giteaBaseUrl + 'orgs?access_token=' + accessToken, {
    username: orgName,
  });
});

/**
 * delete an org with org name, authenticated using access token
 */
Cypress.Commands.add('deleteorg', (orgName, accessToken) => {
  var endpoint = giteaBaseUrl + 'orgs/' + orgName + '?access_token=' + accessToken;
  cy.request({
    method: 'GET',
    url: endpoint,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status == 200 && response.body.username == orgName) cy.request('DELETE', endpoint);
  });
});

/**
 * delete all the apps of an org, authenticated using access token
 */
Cypress.Commands.add('deleteallapps', (orgName, accessToken) => {
  var getReposEndpoint = giteaBaseUrl + 'orgs/' + orgName + '/repos?access_token=' + accessToken;
  cy.request('GET', getReposEndpoint).then((response) => {
    var repos = response.body;
    for (var i = 0; i < repos.length; i++) {
      cy.request('DELETE', giteaBaseUrl + '/repos/' + orgName + '/' + repos[i].name + '?access_token=' + accessToken);
    }
  });
});

/**
 * make an user as the owner of an org's repo, authenticated using access token
 */
Cypress.Commands.add('makeuserowner', (orgName, userName, accessToken) => {
  var getTeamsEndpoint = giteaBaseUrl + 'orgs/' + orgName + '/teams?access_token=' + accessToken;
  cy.request('GET', getTeamsEndpoint).then((response) => {
    var teams = response.body;
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].permission == 'owner') {
        cy.request(
          'PUT',
          giteaBaseUrl + 'teams/' + teams[i].id + '/members/' + userName + '?access_token=' + accessToken,
        );
        break;
      }
    }
  });
});

/**
 * Delete an user by username, authenticated using access token
 */
Cypress.Commands.add('deleteuser', (userName, accessToken) => {
  var endpoint = giteaBaseUrl + 'admin/users/' + userName + '?access_token=' + accessToken;
  cy.request('DELETE', endpoint);
});
