/// <reference types="cypress" />

const giteaBaseUrl = Cypress.config().baseUrl + '/repos/api/v1';

/**
 * create an org with org name, authenticated using access token
 */
Cypress.Commands.add('createOrg', (orgName, accessToken) =>
  cy.request('POST', `${giteaBaseUrl}/orgs?token=${accessToken}`, {
    username: orgName,
  }),
);

/**
 * delete an org with org name, authenticated using access token
 */
Cypress.Commands.add('deleteOrg', (orgName, accessToken) =>
  cy
    .request({
      method: 'GET',
      url: `${giteaBaseUrl}/orgs/${orgName}?token=${accessToken}`,
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status === 200 && response.body.username === orgName)
        cy.request('DELETE', endpoint);
    }),
);

/**
 * delete all the apps of an org, authenticated using access token
 */
Cypress.Commands.add('deleteAllApps', (ownerName, accessToken, isOrg) => {
  const getReposEndpoint = isOrg
    ? `${giteaBaseUrl}/orgs/${ownerName}/repos?token=${accessToken}`
    : `${giteaBaseUrl}/users/${ownerName}/repos?token=${accessToken}`;
  cy.request('GET', getReposEndpoint).then((response) => {
    const repos = response.body;
    for (let i = 0; i < repos.length; i++) {
      cy.request(
        'DELETE',
        `${giteaBaseUrl}/repos/${ownerName}/${repos[i].name}?token=${accessToken}`,
      );
    }
  });
});

Cypress.Commands.add('deleteApp', (ownerName, appName, accessToken) =>
  cy.request({
    method: 'DELETE',
    url: `${giteaBaseUrl}/repos/${ownerName}/${appName}?token=${accessToken}`,
    failOnStatusCode: false,
  }),
);

/**
 * make an user as the owner of an org's repo, authenticated using access token
 */
Cypress.Commands.add('makeUserOwner', (orgName, userName, accessToken) =>
  cy
    .request('GET', `${giteaBaseUrl}/orgs/${orgName}/teams?token=${accessToken}`)
    .then((response) => {
      const teams = response.body;
      for (let i = 0; i < teams.length; i++) {
        if (teams[i].permission === 'owner') {
          cy.request(
            'PUT',
            `${giteaBaseUrl}/teams/${teams[i].id}/members/${userName}?token=${accessToken}`,
          );
          break;
        }
      }
    }),
);

/**
 * Delete an user by username, authenticated using access token
 */
Cypress.Commands.add('deleteUser', (userName, accessToken) => {
  const endpoint = `${giteaBaseUrl}/admin/users/${userName}?token=${accessToken}`;
  cy.request('DELETE', endpoint);
});

/**
 * create a repo with app name, authenticated using access token
 */
Cypress.Commands.add('createRepository', (userName, appName, accessToken) => {
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
Cypress.Commands.add('getRepoByAppId', (appId, accessToken) =>
  cy.request({
    method: 'GET',
    url: `${giteaBaseUrl}/repos/${appId}?token=${accessToken}`,
    failOnStatusCode: false,
  }),
);
