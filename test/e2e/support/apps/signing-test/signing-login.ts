import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Tenor } from 'test/e2e/support/users';
import type { TenorUser } from 'test/e2e/support/users';

type User = 'manager' | 'accountant' | 'auditor';

const tenorUserMapping: Record<User, TenorUser> = {
  manager: Tenor.users.raffinertFilm,
  accountant: Tenor.users.beskjedenGitar,
  auditor: Tenor.users.dypsindigLoddsnor,
};

export function signingTestLogin(user: User) {
  const appFrontend = new AppFrontend();
  cy.waitUntilSaved();
  cy.url().then((url) => {
    const instanceSuffix = new URL(url).hash;
    cy.log('Instance suffix:', instanceSuffix || 'none');

    const tenorUser = tenorUserMapping[user];

    cy.startAppInstance(appFrontend.apps.signingTest, { cyUser: user, urlSuffix: instanceSuffix, tenorUser });

    if (!instanceSuffix && Cypress.env('type') !== 'localtest') {
      const org = Tenor.orgs.overflodigSlemTigerAS;
      cy.findByText('Hvem vil du sende inn for?').should('be.visible');
      cy.findByRole('textbox', { name: 'Søk etter aktør' }).type(org.name);
      cy.findByRole('button', { name: new RegExp(`org.nr. ${org.orgNr}`) }).click();
    }

    cy.assertUser(user, tenorUser);
  });
}
