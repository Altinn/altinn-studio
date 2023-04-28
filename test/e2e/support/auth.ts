import type { IProcessPermissions } from 'src/features/process';

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

function getPermissions(format: string): IProcessPermissions {
  const permissions: IProcessPermissions = {
    read: false,
    write: false,
    actions: {},
  };
  for (const i of format) {
    switch (i) {
      case 'r':
        permissions.read = true;
        break;
      case 'w':
        permissions.write = true;
        break;
      case 'i':
        permissions.actions = { ...permissions.actions, instantiate: true };
        break;
      case 'c':
        permissions.actions = { ...permissions.actions, confirm: true };
        break;
      case 's':
        permissions.actions = { ...permissions.actions, sign: true };
        break;
      case 'j':
        permissions.actions = { ...permissions.actions, reject: true };
        break;
    }
  }
  return permissions;
}

Cypress.Commands.add('setPermissions', (permissionFormat: string) => {
  Cypress.env('authPermissions', permissionFormat);
});

Cypress.Commands.add('interceptPermissions', () => {
  const interceptor = (req) => {
    const permissionFormat = Cypress.env('authPermissions') ?? '';
    const permissions = getPermissions(permissionFormat);
    req.on('response', (res) => {
      if (res.body.currentTask) {
        res.body.currentTask.read = permissions.read;
        res.body.currentTask.write = permissions.write;
        res.body.currentTask.actions = permissions.actions;
      }
    });
  };
  cy.intercept({ method: 'GET', url: '**/process' }, interceptor).as('getProcess');
  cy.intercept({ method: 'PUT', url: '**/process/next*' }, interceptor).as('processNext');
});
