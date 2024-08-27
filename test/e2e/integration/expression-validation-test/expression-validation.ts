import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Expression validation', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
    cy.startAppInstance(appFrontend.apps.expressionValidationTest);
  });

  it('should show validation messages', () => {
    cy.findByRole('textbox', { name: /fornavn/i }).type('Per');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Hansen');

    cy.findByRole('textbox', { name: /alder/i }).type('17');
    cy.findByRole('alert', { name: /skriftlige samtykke/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('textbox', { name: /alder/i }).clear();
    cy.findByRole('textbox', { name: /alder/i }).type('14');
    cy.findByRole('alert', { name: /skriftlige samtykke/i }).should('not.exist');
    cy.get(appFrontend.errorReport).should('contain.text', 'Minste gyldig tall er 15');
    cy.findByRole('textbox', { name: /alder/i }).clear();
    cy.findByRole('textbox', { name: /alder/i }).type('15');
    cy.findByRole('alert', { name: /skriftlige samtykke/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('textbox', { name: /alder/i }).clear();
    cy.findByRole('textbox', { name: /alder/i }).type('18');
    cy.findByRole('alert', { name: /skriftlige samtykke/i }).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.dsSelect(appFrontend.expressionValidationTest.kjønn, 'Mann');

    cy.findByRole('textbox', { name: /e-post/i }).type('asdf');
    cy.get(appFrontend.errorReport).should('contain.text', 'Feil format');
    cy.findByRole('textbox', { name: /e-post/i }).clear();
    cy.findByRole('textbox', { name: /e-post/i }).type('test@test.test');
    cy.get(appFrontend.errorReport).should('not.contain.text', 'Feil format eller verdi');
    cy.get(appFrontend.errorReport).should('contain.text', "E-post må slutte med '@altinn.no'");
    cy.findByRole('textbox', { name: /e-post/i }).clear();
    cy.findByRole('textbox', { name: /e-post/i }).type('test@altinn.no');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.findByRole('textbox', { name: /telefonnummer/i }).type('45612378');
    cy.get(appFrontend.errorReport).should('contain.text', "Telefonnummer må starte med '9'");
    cy.findByRole('textbox', { name: /telefonnummer/i }).clear();
    cy.findByRole('textbox', { name: /telefonnummer/i }).type('98765432');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.dsSelect(appFrontend.expressionValidationTest.bosted, 'Oslo');

    cy.findByRole('button', { name: /neste/i }).click();
    cy.navPage('Skjul felter').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.receipt.container).should('be.visible');
  });

  it('should ignore hidden fields', () => {
    cy.findByRole('textbox', { name: /alder/i }).type('16');
    cy.findByRole('textbox', { name: /e-post/i }).type('test@test.test');
    cy.findByRole('textbox', { name: /telefonnummer/i }).type('45612378');

    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.findByRole('alert', { name: /skriftlige samtykke/i }).should('be.visible');
    cy.gotoNavPage('Skjul felter');

    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut fornavn');
    cy.findByRole('checkbox', { name: /fornavn/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.contain.text', 'Du må fylle ut fornavn');

    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut etternavn');
    cy.findByRole('checkbox', { name: /etternavn/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.contain.text', 'Du må fylle ut etternavn');

    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut kjønn');
    cy.findByRole('checkbox', { name: /kjønn/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.contain.text', 'Du må fylle ut kjønn');

    cy.get(appFrontend.errorReport).should('contain.text', "E-post må slutte med '@altinn.no'");
    cy.findByRole('checkbox', { name: /e-post/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.contain.text', "E-post må slutte med '@altinn.no'");

    cy.get(appFrontend.errorReport).should('contain.text', "Telefonnummer må starte med '9'");
    cy.findByRole('checkbox', { name: /telefon/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.contain.text', "Telefonnummer må starte med '9'");

    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut bosted');
    cy.findByRole('checkbox', { name: /bosted/i }).dsCheck();
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.receipt.container).should('be.visible');
  });

  it('should show validation messages for repeating groups', () => {
    cy.gotoNavPage('Skjul felter');

    cy.findByRole('checkbox', { name: /fornavn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /etternavn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /alder/i }).dsCheck();
    cy.findByRole('checkbox', { name: /kjønn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /e-post/i }).dsCheck();
    cy.findByRole('checkbox', { name: /telefon/i }).dsCheck();
    cy.findByRole('checkbox', { name: /bosted/i }).dsCheck();

    cy.gotoNavPage('CV');

    for (let a = 0; a < 2; a++) {
      cy.findByRole('button', { name: /legg til ny arbeidserfaring/i }).click();
      cy.findByRole('textbox', { name: /arbeidsgiver/i }).type(`Digitaliseringsdirektoratet ${a + 1}`);
      cy.findByRole('textbox', { name: /fra/i }).type('01.01.2020');
      cy.findByRole('textbox', { name: /^til/i }).type('31.12.2020');
      cy.findByRole('textbox', { name: /stilling/i }).type('Seniorutvikler');
      cy.findByRole('textbox', { name: /beskrivelse/i }).type('flink');
      cy.get(appFrontend.errorReport).should('contain.text', 'Beskrivelse kan ikke være flink');
      cy.findByRole('textbox', { name: /beskrivelse/i }).clear();
      cy.findByRole('textbox', { name: /beskrivelse/i }).type('Jobbet med Altinn Studio');
      cy.get(appFrontend.errorReport).should('not.exist');

      cy.get(appFrontend.expressionValidationTest.uploaders)
        .last()
        .selectFile('test/e2e/fixtures/test.pdf', { force: true });
      cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Sertifisering');
      cy.findByRole('button', { name: /^lagre$/i }).click();

      for (let p = 0; p < 2; p++) {
        cy.findByRole('button', { name: /legg til ny prosjekt/i }).click();
        cy.findByRole('textbox', { name: /tittel/i }).type(`Altinn ${p + 1}`);
        cy.findAllByRole('textbox', { name: /beskrivelse/i })
          .last()
          .type('kult');
        cy.get(appFrontend.errorReport).should('contain.text', 'Beskrivelse kan ikke være kult');
        cy.findAllByRole('textbox', { name: /beskrivelse/i })
          .last()
          .clear();
        cy.findAllByRole('textbox', { name: /beskrivelse/i })
          .last()
          .type('Laget Altinn Studio');
        cy.get(appFrontend.errorReport).should('not.exist');
        cy.findAllByRole('button', { name: /lagre og lukk/i })
          .eq(2)
          .click();
      }

      cy.findAllByRole('button', { name: /lagre og lukk/i })
        .last()
        .click();
    }

    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.receipt.container).should('be.visible');
  });

  it('should work with hiddenRow', () => {
    // Ability to save group row with errors
    cy.interceptLayout('skjema', (c) => {
      if (c.type === 'RepeatingGroup') {
        c.validateOnSaveRow = undefined;
      }
    });

    cy.gotoNavPage('Skjul felter');

    cy.findByRole('checkbox', { name: /fornavn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /etternavn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /alder/i }).dsCheck();
    cy.findByRole('checkbox', { name: /kjønn/i }).dsCheck();
    cy.findByRole('checkbox', { name: /e-post/i }).dsCheck();
    cy.findByRole('checkbox', { name: /telefon/i }).dsCheck();
    cy.findByRole('checkbox', { name: /bosted/i }).dsCheck();

    cy.gotoNavPage('CV');

    const rows: { stilling: string; error: boolean; prosjekter: { tittel: string; error: boolean }[] }[] = [
      {
        stilling: 'GyldigUtvikler',
        error: false,
        prosjekter: [
          { tittel: 'GyldigProsjekt', error: false },
          { tittel: 'UgyldigProsjekt', error: true },
          { tittel: 'GyldigProsjekt', error: false },
          { tittel: 'UgyldigProsjekt', error: true },
        ],
      },
      {
        stilling: 'UgyldigUtvikler',
        error: true,
        prosjekter: [
          { tittel: 'UgyldigProsjekt', error: true },
          { tittel: 'GyldigProsjekt', error: false },
          { tittel: 'ErrorProsjekt', error: true },
          { tittel: 'UgyldigProsjekt', error: true },
        ],
      },
      {
        stilling: 'UgyldigUtvikler',
        error: true,
        prosjekter: [],
      },
    ];

    for (const row of rows) {
      cy.findByRole('button', { name: /legg til ny arbeidserfaring/i }).click();
      cy.findByRole('textbox', { name: /arbeidsgiver/i }).type('Digitaliseringsdirektoratet');
      cy.findByRole('textbox', { name: /fra/i }).type('01.01.2020');
      cy.findByRole('textbox', { name: /^til/i }).type('31.12.2020');
      cy.findByRole('textbox', { name: /stilling/i }).type(row.stilling);
      cy.findByRole('textbox', { name: /beskrivelse/i }).type(row.error ? 'flink' : 'Jobbet med Altinn Studio');

      cy.get(appFrontend.expressionValidationTest.uploaders)
        .last()
        .selectFile('test/e2e/fixtures/test.pdf', { force: true });
      cy.get(appFrontend.expressionValidationTest.groupTag).should('not.be.disabled');
      cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Sertifisering');
      cy.findByRole('button', { name: /^lagre$/i }).click();

      for (const prosjekt of row.prosjekter) {
        cy.findByRole('button', { name: /legg til ny prosjekt/i }).click();
        cy.findByRole('textbox', { name: /tittel/i }).type(prosjekt.tittel);
        cy.findAllByRole('textbox', { name: /beskrivelse/i })
          .last()
          .type(prosjekt.error ? 'kult' : 'Laget Altinn Studio');
        cy.findAllByRole('button', { name: /lagre og lukk/i })
          .eq(-2)
          .click();
      }

      cy.findAllByRole('button', { name: /lagre og lukk/i })
        .last()
        .click();
    }

    cy.findByRole('button', { name: /neste/i }).click();
    cy.get(appFrontend.errorReport).should('be.visible');

    cy.gotoNavPage('Skjul felter');
    cy.findByRole('textbox', { name: /skjul rad basert på stilling/i }).type('UgyldigUtvikler');
    cy.findByRole('textbox', { name: /skjul nøstet rad basert på prosjekt-tittel/i }).type('UgyldigProsjekt');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.receipt.container).should('be.visible');
  });
});
