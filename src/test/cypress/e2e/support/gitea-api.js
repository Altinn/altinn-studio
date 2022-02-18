/// <reference types="cypress" />

const giteaBaseUrl = Cypress.config().baseUrl + '/repos/api/v1';

/**
 * create an org with org name, authenticated using access token
 */
Cypress.Commands.add('createorg', (orgName, accessToken) => {
  cy.request('POST', `${giteaBaseUrl}/orgs?token=${accessToken}`, {
    username: orgName,
  });
});

/**
 * delete an org with org name, authenticated using access token
 */
Cypress.Commands.add('deleteorg', (orgName, accessToken) => {
  var endpoint = `${giteaBaseUrl}/orgs/${orgName}?token=${accessToken}`;
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
Cypress.Commands.add('deleteallapps', (type, ownerName, accessToken) => {
  var getReposEndpoint;
  if (type === 'org') getReposEndpoint = `${giteaBaseUrl}/orgs/${ownerName}/repos?token=${accessToken}`;
  if (type === 'user') getReposEndpoint = `${giteaBaseUrl}/user/repos?token=${accessToken}`;

  cy.request('GET', getReposEndpoint).then((response) => {
    var repos = response.body;
    for (var i = 0; i < repos.length; i++) {
      cy.request('DELETE', `${giteaBaseUrl}/repos/${ownerName}/${repos[i].name}?token=${accessToken}`);
    }
  });
});

/**
 * make an user as the owner of an org's repo, authenticated using access token
 */
Cypress.Commands.add('makeuserowner', (orgName, userName, accessToken) => {
  var getTeamsEndpoint = `${giteaBaseUrl}/orgs/${orgName}/teams?token=${accessToken}`;
  cy.request('GET', getTeamsEndpoint).then((response) => {
    var teams = response.body;
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].permission == 'owner') {
        cy.request('PUT', `${giteaBaseUrl}/teams/${teams[i].id}/members/${userName}?token=${accessToken}`);
        break;
      }
    }
  });
});

/**
 * Delete an user by username, authenticated using access token
 */
Cypress.Commands.add('deleteuser', (userName, accessToken) => {
  var endpoint = `${giteaBaseUrl}/admin/users/${userName}?token=${accessToken}`;
  cy.request('DELETE', endpoint);
});

/**
 * create a repo with app name, authenticated using access token
 */
Cypress.Commands.add('createrepository', (userName, appName, accessToken) => {
  cy.request('POST', `${giteaBaseUrl}/admin/users/${userName}/repos?token=${accessToken}`, {
    auto_init: false,
    default_branch: 'master',
    name: appName,
    private: false,
  });
});

/**
 * get an app repo and return response
 */
Cypress.Commands.add('getrepo', (appId, accessToken) => {
  return cy.request({
    method: 'GET',
    url: `${giteaBaseUrl}/repos/${appId}?token=${accessToken}`,
    failOnStatusCode: false,
  });
});
