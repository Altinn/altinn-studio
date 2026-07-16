import type { CyHttpMessages, RouteHandler } from 'cypress/types/net-stubbing';

import type { TenorLoginParams, TenorUser } from 'test/e2e/support/users';

import type { IProcess, ITask } from 'src/types/shared';

export type CyUser =
  | 'default'
  | 'manager'
  | 'accountant'
  | 'auditor'
  | 'selfIdentified'
  | 'multiPartyPrompt'
  | 'multiPartyPrompt2'
  | 'doNotPromptParty';

type UserInfo = {
  firstName: string;
  displayName: string;
  userName: string;
  userPassword: string;
  localPartyId: string;
};

export const cyUserCredentials: { [K in CyUser]: UserInfo } = {
  default: {
    firstName: Cypress.env('defaultFirstName'),
    displayName: Cypress.env('defaultFullName'),
    userName: Cypress.env('defaultUserName'),
    userPassword: Cypress.env('defaultUserPwd'),
    localPartyId: Cypress.env('defaultPartyId'),
  },
  manager: {
    firstName: Cypress.env('managerFirstName'),
    displayName: Cypress.env('managerFullName'),
    userName: Cypress.env('managerUserName'),
    userPassword: Cypress.env('managerUserPwd'),
    localPartyId: Cypress.env('managerPartyId'),
  },
  accountant: {
    firstName: Cypress.env('accountantFirstName'),
    displayName: Cypress.env('accountantFullName'),
    userName: Cypress.env('accountantUserName'),
    userPassword: Cypress.env('accountantUserPwd'),
    localPartyId: Cypress.env('accountantPartyId'),
  },
  auditor: {
    firstName: Cypress.env('auditorFirstName'),
    displayName: Cypress.env('auditorFullName'),
    userName: Cypress.env('auditorUserName'),
    userPassword: Cypress.env('auditorUserPwd'),
    localPartyId: Cypress.env('auditorPartyId'),
  },
  selfIdentified: {
    firstName: Cypress.env('selfIdentifiedFirstName'),
    displayName: Cypress.env('selfIdentifiedFullName'),
    userName: Cypress.env('selfIdentifiedUserName'),
    userPassword: Cypress.env('selfIdentifiedUserPwd'),
    localPartyId: Cypress.env('selfIdentifiedPartyId'),
  },
  multiPartyPrompt: {
    firstName: Cypress.env('multiPartyPromptFirstName'),
    displayName: Cypress.env('multiPartyPromptFullName'),
    userName: Cypress.env('multiPartyPromptUserName'),
    userPassword: Cypress.env('multiPartyPromptUserPwd'),
    localPartyId: Cypress.env('multiPartyPromptPartyId'),
  },
  multiPartyPrompt2: {
    firstName: Cypress.env('multiPartyPrompt2FirstName'),
    displayName: Cypress.env('multiPartyPrompt2FullName'),
    userName: Cypress.env('multiPartyPrompt2UserName'),
    userPassword: Cypress.env('multiPartyPrompt2UserPwd'),
    localPartyId: Cypress.env('multiPartyPrompt2PartyId'),
  },
  doNotPromptParty: {
    firstName: Cypress.env('doNotPromptPartyFirstName'),
    displayName: Cypress.env('doNotPromptPartyFullName'),
    userName: Cypress.env('doNotPromptPartyUserName'),
    userPassword: Cypress.env('doNotPromptPartyUserPwd'),
    localPartyId: Cypress.env('doNotPromptPartyPartyId'),
  },
};

export const getDisplayName = (user: CyUser) => cyUserCredentials[user].displayName;
export const getLocalPartyId = (user: CyUser) => cyUserCredentials[user].localPartyId;

Cypress.Commands.add('assertUser', (user: CyUser, tenorUser: TenorUser) => {
  if (Cypress.env('type') === 'localtest') {
    cy.get('[data-testid=AppHeader]').should('contain.text', getDisplayName(user));
  } else {
    cy.get('[data-testid=AppHeader]').should('contain.text', tenorUser.reverseName.toUpperCase());
  }
});

const emptyPageHtml = `
<h3>Empty page loaded, proceeding to app</h3>
<script>
  (() => {
    const reloadOnHashChange = () => {
      if (window.location.hash) {
        window.location.reload();
      }
    };

    window.addEventListener('hashchange', reloadOnHashChange);
    reloadOnHashChange();
  })();
</script>
`;

type MinimalTask = Pick<ITask, 'read' | 'write' | 'actions'>;
function getPermissions(format: string): MinimalTask {
  const permissions: MinimalTask = {
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
  const interceptor: RouteHandler = (req) => {
    const permissionFormat = Cypress.env('authPermissions') ?? '';
    const permissions = getPermissions(permissionFormat);
    req.on('response', (res) => {
      const body = res.body as IProcess;
      if (body.currentTask) {
        body.currentTask.read = permissions.read;
        body.currentTask.write = permissions.write;
        body.currentTask.actions = permissions.actions;
      }
    });
  };
  cy.intercept({ method: 'GET', url: '**/process' }, interceptor).as('getProcess');
  cy.intercept({ method: 'PUT', url: '**/process/next*' }, interceptor).as('processNext');
});

type CyUserLoginParams = {
  cyUser: CyUser;
  authenticationLevel: string;
};

export function cyUserLogin({ cyUser, authenticationLevel }: CyUserLoginParams) {
  cy.log(`Logging in as user: ${cyUser}`);
  const user = cyUserCredentials[cyUser];

  if (Cypress.env('type') === 'localtest') {
    return localLogin({ partyId: user.localPartyId, authenticationLevel });
  }

  const { userName, userPassword } = user;
  if (userName === cyUserCredentials.selfIdentified.userName) {
    return loginSelfIdentifiedTt02Login(userName, userPassword);
  }

  throw new Error(`Login not implemented for user: ${cyUser}`);
}

type LocalLoginParams =
  | {
      partyId: string;
      authenticationLevel: string;
    }
  | {
      displayName: string;
      authenticationLevel: string;
    };

function localLogin({ authenticationLevel, ...rest }: LocalLoginParams) {
  if ('partyId' in rest) {
    return logInLocalUser(rest.partyId, authenticationLevel);
  }

  // Tenor users do not have a party ID in the Cypress configuration. Fetching the page is still much
  // cheaper than visiting it, and lets us resolve the value expected by Localtest's UserSelect field.
  return cy.request<string>('/').then(({ body }) => {
    const document = new DOMParser().parseFromString(body, 'text/html');
    const userSelect = Array.from(document.querySelectorAll<HTMLOptionElement>('#UserSelect option')).find((option) =>
      option.textContent?.toLowerCase().includes(rest.displayName.toLowerCase()),
    )?.value;
    expect(userSelect, `Localtest user matching ${rest.displayName}`).to.not.be.empty;
    return logInLocalUser(userSelect!, authenticationLevel);
  });
}

function logInLocalUser(userSelect: string, authenticationLevel: string) {
  cy.log(`Logging in as local user: ${userSelect} with authentication level: ${authenticationLevel}`);

  // Localtest's reauthenticate action creates the same authentication and party cookies as the login form,
  // but deliberately responds without redirecting. Cypress persists cookies from cy.request(), allowing the
  // following cy.visit() to open the app already authenticated.
  cy.request({
    method: 'POST',
    url: '/Home/LogInTestUser',
    form: true,
    body: {
      action: 'reauthenticate',
      UserSelect: userSelect,
      AuthenticationLevel: authenticationLevel,
    },
  })
    .its('status')
    .should('eq', 204);
}

function loginSelfIdentifiedTt02Login(user: string, pwd: string) {
  // TODO: This does not work after A2 sunset, we'll need to find another way to login with a self-identified user in tests
  const loginUrl = 'https://tt02.altinn.no/ui/Authentication/SelfIdentified';
  cy.visit(loginUrl);
  cy.findByRole('textbox', { name: /Brukernavn/i }).type(user);
  cy.get('input[type=password]').type(pwd);

  cy.intercept(
    {
      method: 'POST',
      url: '**/Authentication/SelfIdentified',
      times: 1,
    },
    (req) => {
      req.on('response', (res) => {
        expect(res.statusCode).to.eq(302);
        res.send(200, emptyPageHtml);
      });
    },
  ).as('login');

  cy.findByRole('button', { name: /Logg inn/i }).click();
  cy.findByRole('heading', { name: 'Empty page loaded, proceeding to app' }).should('exist');
}

/************************
 *
 * TENOR AUTHENTICATION
 *
 * You can find these users and organizations at: https://testdata.skatteetaten.no/
 * If using these for an app, you must add the users and organizations to the
 * wwwroot/testData.json file for that specific app.
 *
 ************************/

export type AppResponseRef = { current: ((res: CyHttpMessages.IncomingHttpResponse) => void) | undefined };

export function tenorUserLogin(props: TenorLoginParams) {
  cy.log(`Logging in as Tenor user: ${props.tenorUser.name}`);

  if (Cypress.env('type') === 'localtest') {
    return localLogin({ displayName: props.tenorUser.name, authenticationLevel: props.authenticationLevel });
  }

  return tenorTt02Login(props);
}

function tenorTt02Login({ appName, tenorUser }: Omit<TenorLoginParams, 'authenticationLevel'>) {
  // This page was made to have an endpoint serving text/html for Cypress to set the correct origin before logging in
  // via Tenor (as that happens on another origin). If we just visited the app directly, Cypress would notice the
  // redirect and think the login page was the app itself, and some things would break (like accessing window.Cypress).
  const appOrigin = `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}`;
  const appUrl = `${appOrigin}/ttd/${appName}`;
  cy.visit(`${appUrl}/login.html`);
  cy.location('origin').should('eq', appOrigin);
  cy.get('h2').should('have.text', 'Placeholder page for Cypress to set origin before logging in via Tenor');
  cy.get('a').click();

  cy.origin('https://login.test.idporten.no', () => {
    cy.get('a[href="/authorize/testid1"]').click();
  });
  cy.origin('https://testid.test.idporten.no', { args: tenorUser }, (tenorUser) => {
    cy.get('input[name=pid]').type(tenorUser.ssn);
  });

  cy.get<AppResponseRef>('@appResponse').then((ref) => {
    ref.current = (res) => {
      // Returning empty 200 OK here lets us call cy.visit() to open the app later, without ending up opening the
      // app multiple times after logging in. Normally, a click on the party below would go straight to opening the
      // app we're testing.
      ref.current = undefined;

      // We need to override set-cookie to keep the XSRF token cookie, as these cookies will be forgotten in the next
      // request unless we override the SameSite and Secure attributes.
      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const isHttps = Cypress.config('baseUrl')?.startsWith('https');
        res.headers['set-cookie'] = cookies.map((cookie) => {
          let modifiedCookie = cookie;

          // Set or replace SameSite attribute
          if (/samesite\s*=\s*\w+/i.test(modifiedCookie)) {
            modifiedCookie = modifiedCookie.replace(/samesite\s*=\s*\w+/gi, 'SameSite=None');
          } else {
            modifiedCookie = `${modifiedCookie}; SameSite=None`;
          }

          // Add Secure attribute if over HTTPS and not already present
          if (isHttps && !/;\s*secure/i.test(modifiedCookie)) {
            modifiedCookie = `${modifiedCookie}; Secure`;
          }

          return modifiedCookie;
        });
      }

      res.send(200, emptyPageHtml);
    };
  });

  cy.origin('https://testid.test.idporten.no', () => {
    cy.get('button[type=submit]').click();
  });

  cy.findByRole('heading', { name: 'Empty page loaded, proceeding to app' }).should('exist');
}
