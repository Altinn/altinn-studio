import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Tenor } from 'test/e2e/support/users';
import { reverseName } from 'test/e2e/support/utils';

const appFrontend = new AppFrontend();

describe('Signing', () => {
  it('should allow signing by a specified signee and on behalf of a company', () => {
    cy.preventPartySelection();

    // Step 1: Log in as the initial user
    cy.startAppInstance(appFrontend.apps.signeringBrukerstyrt, {
      cyUser: null,
      tenorUser: Tenor.users.humanAndrefiolin,
      authenticationLevel: '2',
    });

    // Step 2: Fill in the form and specify other valid users as signees

    // Om selskapet
    cy.url().then(() => {
      cy.findByRole('textbox', { name: /navn/i }).type('Testselskap AS');
      cy.findByRole('button', { name: /neste/i }).click();

      // Stiftere og aksjetegning

      // Person: Human Andrefiolin
      cy.findByRole('button', { name: /legg til person/i }).click();
      cy.findByRole('textbox', { name: /fødselsnummer/i }).type(Tenor.users.humanAndrefiolin.ssn);
      cy.findByRole('textbox', { name: /navn/i }).type(Tenor.users.humanAndrefiolin.name.split(' ')[1]);
      cy.findByRole('button', { name: /hent opplysninger/i }).click();

      cy.waitUntilSaved();
      cy.findByRole('textbox', { name: /navn/i }).should('have.value', Tenor.users.humanAndrefiolin.name.toUpperCase());

      cy.findByRole('textbox', { name: /adresse/i }).type('Testveien 1');
      cy.findByRole('textbox', { name: /postnr/i }).type('0244');
      cy.findByRole('textbox', { name: /poststed/i }).should('have.value', 'OSLO');
      cy.findByTestId('group-edit-container').within(() => {
        cy.findByRole('button', { name: /lagre og lukk/i }).click();
      });

      //Person: Standhaftig Bjørnunge
      cy.findByRole('button', { name: /legg til person/i }).click();
      cy.findByRole('textbox', { name: /fødselsnummer/i }).type(Tenor.users.standhaftigBjornunge.ssn);
      cy.findByRole('textbox', { name: /navn/i }).type(Tenor.users.standhaftigBjornunge.name.split(' ')[1]);
      cy.findByRole('button', { name: /hent opplysninger/i }).click();

      cy.waitUntilSaved();
      cy.findByRole('textbox', { name: /navn/i }).should(
        'have.value',
        Tenor.users.standhaftigBjornunge.name.toUpperCase(),
      );

      cy.findByRole('textbox', { name: /adresse/i }).type('Testveien 2');
      cy.findByRole('textbox', { name: /postnr/i }).type('0244');
      cy.findByRole('textbox', { name: /poststed/i }).should('have.value', 'OSLO');
      cy.findByTestId('group-edit-container').within(() => {
        cy.findByRole('button', { name: /lagre og lukk/i }).click();
      });

      // Virksomhet: Sivilisert Avansert Isbjørn SA
      cy.findByRole('button', { name: /legg til virksomhet/i }).click();
      cy.findByRole('textbox', { name: /organisasjonsnummer/i }).type(Tenor.orgs.sivilisertAvansertIsbjoernSA.orgNr);
      cy.findByRole('button', { name: /hent opplysninger/i }).click();
      cy.findByTestId('group-edit-container').within(() => {
        cy.findByRole('button', { name: /lagre og lukk/i }).click();
      });
      cy.findByRole('button', { name: /neste/i }).click();

      // Aksjekapital
      cy.findByRole('textbox', { name: /aksjekapital/i }).type('1000000');
      cy.findByRole('textbox', { name: /aksjens pålydende/i }).type('10000');
      cy.findByRole('textbox', { name: /frist for innbetaling av aksjeinnskuddet/i }).type('31.12.2030');
      cy.findByRole('button', { name: /neste/i }).click();

      // Styre
      cy.findByRole('textbox', { name: /fødselsnummer/i }).type(Tenor.users.varsomDiameter.ssn);
      cy.findByRole('textbox', { name: /etternavn/i }).type(Tenor.users.varsomDiameter.name.split(' ')[1]);
      cy.findByRole('button', { name: /hent opplysninger/i }).click();

      cy.findByRole('radio', {
        name: /årsregnskapene skal ikke revideres og selskapet skal ikke ha revisor/i,
      }).click();
      cy.findByRole('button', { name: /neste/i }).click();

      // Stiftelsesdokumenter
      cy.findByRole('button', { name: /til signering/i }).click();

      // Signing step
      cy.findByRole('heading', { name: /personer som skal signere/i });
      cy.findByText(/personer som skal signere beskrivelse/i);
      cy.findByRole('table', { name: /personer som skal signere/i }).within(() => {
        cy.findByRole('row', {
          name: new RegExp(
            `${Tenor.orgs.sivilisertAvansertIsbjoernSA.name} (venter på signering|varsling mislyktes)`,
            'i',
          ),
        });
        cy.findByRole('row', {
          name: new RegExp(
            `(${Tenor.users.humanAndrefiolin.name}|${reverseName(Tenor.users.humanAndrefiolin.name)}) (venter på signering|varsling mislyktes)`,
            'i',
          ),
        });
        cy.findByRole('row', {
          name: new RegExp(
            `(${Tenor.users.standhaftigBjornunge.name}|${reverseName(Tenor.users.standhaftigBjornunge.name)}) (venter på signering|varsling mislyktes)`,
            'i',
          ),
        });
      });

      cy.findByRole('table', { name: /dokumenter som skal signeres/i }).within(() => {
        cy.findByRole('row', { name: /stiftelse av aksjeselskap\s*\.pdf\s*Skjema/i });
      });

      cy.findByRole('radio', {
        name: /meg selv/i,
      }).click();

      cy.findByRole('checkbox', { name: /jeg bekrefter at informasjonen og dokumentene er korrekte/i }).click();
      cy.findByRole('button', { name: 'Signer' }).click();

      cy.findByRole('heading', { name: /personer som skal signere/i });
      cy.findByText(/personer som skal signere beskrivelse/i);
      cy.findByRole('table', { name: /personer som skal signere/i }).within(() => {
        cy.findByRole('row', {
          name: new RegExp(
            `(${Tenor.users.humanAndrefiolin.name}|${reverseName(Tenor.users.humanAndrefiolin.name)})`,
            'i',
          ),
        }).within(() => {
          cy.findByRole('cell', { name: /Signert/i }).should('exist');
        });
      });

      cy.findByText(new RegExp(`du signerer på vegne av ${Tenor.orgs.sivilisertAvansertIsbjoernSA.name}`, 'i'));
      cy.findByRole('checkbox', { name: /jeg bekrefter at informasjonen og dokumentene er korrekte/i }).click();
      cy.findByRole('button', { name: 'Signer' }).click();

      cy.findByText(/venter på signaturer/i);
      cy.findByText(/takk for at du signerte! du kan sende inn skjemaet når alle parter har signert/i);
    });

    cy.hash().then((hash) => {
      cy.startAppInstance(appFrontend.apps.signeringBrukerstyrt, {
        tenorUser: Tenor.users.humanAndrefiolin,
        authenticationLevel: '2',
        urlSuffix: `/${hash}`,
      });
    });

    // TODO: Cannot test signing with the second user as the authorization is cached and may therefore sometimes fail
    // The first user can be tested only because their access is defined in the policy.xml file

    // Step 4: Complete the signing process

    // Verify that the signing was successful

    cy.allowFailureOnEnd();
  });
});
