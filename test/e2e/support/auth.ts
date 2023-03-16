export type user = 'default' | 'manager' | 'accountant' | 'auditor';

type UserInfo = {
  displayName: string;
  userName: string;
  userPassword: string;
  localPartyId: string;
  reportee?: string;
};

const userCredentials: { [K in user]: UserInfo } = {
  default: {
    displayName: Cypress.env('defaultFullName'),
    userName: Cypress.env('defaultUserName'),
    userPassword: Cypress.env('defaultUserPwd'),
    localPartyId: Cypress.env('defaultPartyId'),
  },
  manager: {
    displayName: Cypress.env('managerFullName'),
    userName: Cypress.env('managerUserName'),
    userPassword: Cypress.env('managerUserPwd'),
    localPartyId: Cypress.env('managerPartyId'),
    reportee: Cypress.env('signingPartyId'),
  },
  accountant: {
    displayName: Cypress.env('accountantFullName'),
    userName: Cypress.env('accountantUserName'),
    userPassword: Cypress.env('accountantUserPwd'),
    localPartyId: Cypress.env('accountantPartyId'),
    reportee: Cypress.env('signingPartyId'),
  },
  auditor: {
    displayName: Cypress.env('auditorFullName'),
    userName: Cypress.env('auditorUserName'),
    userPassword: Cypress.env('auditorUserPwd'),
    localPartyId: Cypress.env('auditorPartyId'),
    reportee: Cypress.env('signingPartyId'),
  },
};

export const getDisplayName = (user: user) => userCredentials[user].displayName;

export function login(user: user) {
  if (Cypress.env('environment') === 'local') {
    const { localPartyId } = userCredentials[user];

    const formData = new FormData();
    formData.append('UserSelect', localPartyId);
    formData.append('AuthenticationLevel', '1');

    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/Home/LogInTestUser`,
      body: formData,
    });
  } else {
    const { userName, userPassword, reportee } = userCredentials[user];
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/authentication/authenticatewithpassword`,
      headers: {
        'Content-Type': 'application/hal+json',
      },
      body: JSON.stringify({
        UserName: userName,
        UserPassword: userPassword,
      }),
    });
    if (typeof reportee !== 'undefined') {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/ui/Reportee/ChangeReportee/?R=${reportee}`,
      });
    }
  }
}

export function logout() {
  // Logout in app-localtest is not necessary
  if (Cypress.env('environment') !== 'local') {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/ui/authentication/LogOut`,
      followRedirect: false,
    });
  }
}

Cypress.Commands.add('assertUser', (user: user) => {
  cy.get('[data-testid=AltinnAppHeader]').should('contain.text', getDisplayName(user));
});

Cypress.Commands.add('switchUser', (user: user) => {
  logout();
  login(user);
  cy.reload();
});
