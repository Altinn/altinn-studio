import type { Interception } from 'cypress/types/net-stubbing';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('saving multiple data models', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.multipleDatamodelsTest);
  });

  it('Calls save on individual data models', () => {
    cy.intercept('PATCH', '**/data*').as('saveFormData');

    cy.findByRole('textbox', { name: /tekstfelt 1/i }).type('første');
    cy.findByRole('textbox', { name: /tekstfelt 1/i }).clear();
    cy.findByRole('textbox', { name: /tekstfelt 1/i }).type('andre');
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('tredje');
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).clear();
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('fjerde');

    cy.get('@saveFormData.all').should('have.length', 2); // Check that a total of two saves happened
    cy.get('@saveFormData.all').should(haveTheSameUrls); // And that they were to the same url (multipatch)

    cy.findByRole('textbox', { name: /adresse/i }).type('Brattørgata 3');
    cy.get('@saveFormData.all').should('have.length', 3);

    cy.findByRole('textbox', { name: /postnr/i }).type('7010');
    cy.findByRole('textbox', { name: /poststed/i }).should('have.value', 'TRONDHEIM');

    cy.get('@saveFormData.all').should('have.length', 4);
    cy.get('@saveFormData.all').should(haveTheSameUrls);

    cy.get(appFrontend.altinnError).should('not.exist');
  });

  it('Text resources should be able to read from two writable data models', () => {
    cy.get(appFrontend.multipleDatamodelsTest.variableParagraph).should(
      'contain.text',
      'I første felt står det ingenting, og i det andre feltet står det ikke noe.',
    );

    cy.findByRole('textbox', { name: /tekstfelt 1/i }).type('fin');

    cy.get(appFrontend.multipleDatamodelsTest.variableParagraph).should(
      'contain.text',
      'I første felt står det fin, og i det andre feltet står det ikke noe.',
    );

    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('bil');

    cy.get(appFrontend.multipleDatamodelsTest.variableParagraph).should(
      'contain.text',
      'I første felt står det fin, og i det andre feltet står det bil.',
    );

    cy.findByRole('textbox', { name: /tekstfelt 2/i }).clear();
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('fin');

    cy.get(appFrontend.multipleDatamodelsTest.variableParagraph).should('contain.text', 'Begge feltene er helt like!');

    cy.gotoNavPage('Side3');

    const today = new Date();
    const age1 = 36;
    const y1 = today.getFullYear() - age1;
    const m = (today.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const d = today.getDate().toString().padStart(2, '0');
    const age2 = 25;
    const y2 = today.getFullYear() - age2;

    cy.findByRole('button', { name: /legg til ny/i }).click();

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      'fornavn etternavn er født dato og er dermed alder år gammel',
    );

    cy.findByRole('textbox', { name: /fornavn/i }).type('Per');

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      'Per etternavn er født dato og er dermed alder år gammel',
    );

    cy.findByRole('textbox', { name: /etternavn/i }).type('Hansen');

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      'Per Hansen er født dato og er dermed alder år gammel',
    );

    cy.findByRole('textbox', { name: /fødselsdato/i }).type(`${d}.${m}.${y1}`);
    cy.findByRole('textbox', { name: /fødselsdato/i }).blur();

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      `Per Hansen er født ${y1}-${m}-${d} og er dermed ${age1} år gammel`,
    );

    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();
    cy.findByRole('button', { name: /legg til ny/i }).click();

    cy.findByRole('textbox', { name: /fornavn/i }).type('Hanne');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Persen');
    cy.findByRole('textbox', { name: /fødselsdato/i }).type(`${d}.${m}.${y2}`);
    cy.findByRole('textbox', { name: /fødselsdato/i }).blur();

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      `Hanne Persen er født ${y2}-${m}-${d} og er dermed ${age2} år gammel`,
    );

    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();
    cy.findAllByRole('button', { name: /slett/i }).first().click();

    cy.waitUntilSaved();
    cy.waitUntilNodesReady();
    cy.findByRole('table').find('td').first().should('have.text', 'Hanne');

    cy.findByRole('button', { name: /rediger/i }).click();

    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      `Hanne Persen er født ${y2}-${m}-${d} og er dermed ${age2} år gammel`,
    );

    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();
    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.get(appFrontend.multipleDatamodelsTest.repeatingParagraph).should(
      'contain.text',
      'fornavn etternavn er født dato og er dermed alder år gammel',
    );
  });

  it('Server action can update multiple data models', () => {
    cy.gotoNavPage('Side5');

    cy.findByRole('textbox', { name: /tilfeldig tall/i })
      .invoke('val')
      .should('be.empty');
    cy.findByRole('textbox', { name: /tilfeldig bokstaver/i })
      .invoke('val')
      .should('be.empty');

    cy.findByRole('button', { name: /få tilfeldige verdier/i }).click();
    cy.get(appFrontend.toast).should('contain.text', 'Du må krysse av for vellykket');
    cy.get(appFrontend.toast).click();

    cy.findByRole('textbox', { name: /tilfeldig tall/i })
      .invoke('val')
      .should('be.empty');
    cy.findByRole('textbox', { name: /tilfeldig bokstaver/i })
      .invoke('val')
      .should('be.empty');

    cy.findByRole('checkbox', { name: /vellykket?/i }).click();
    cy.findByRole('button', { name: /få tilfeldige verdier/i }).click();

    cy.findByRole('textbox', { name: /tilfeldig tall/i })
      .invoke('val')
      .should('not.be.empty');
    cy.findByRole('textbox', { name: /tilfeldig bokstaver/i })
      .invoke('val')
      .should('not.be.empty');
  });

  it('List component with search', () => {
    cy.gotoNavPage('Side6');
    cy.findByRole('searchbox', { name: /søk/i }).type('Snekker');
    cy.findAllByRole('radio').should('have.length', 1);
    cy.findByRole('searchbox', { name: /søk/i }).clear();
    cy.findByRole('searchbox', { name: /søk/i }).type('Utvikler');
    cy.findAllByRole('radio').should('have.length', 2);
    cy.findByRole('radio', { name: /johanne/i }).dsCheck();
    cy.findByRole('radio', { name: /johanne/i }).should('be.checked');
    cy.findByRole('searchbox', { name: /søk/i }).clear();
    cy.findAllByRole('radio').should('have.length', 5);
    cy.findByRole('radio', { name: /johanne/i }).should('be.checked');
  });

  it('Likert component', () => {
    cy.intercept('PATCH', '**/data*').as('saveFormData');
    cy.gotoNavPage('Side4');

    // The 'choose-sector' radio component has a 'preselectedOptionIndex' which will auto-select an option before
    // we get a chance to interact with it ourselves, thus an initial save will happen.
    cy.get('@saveFormData.all').should('have.length', 1);

    cy.findAllByRole('radio', { name: /middels/i })
      .eq(0)
      .click();
    cy.findAllByRole('radio', { name: /i liten grad/i })
      .eq(1)
      .click();
    cy.findAllByRole('radio', { name: /i stor grad/i })
      .eq(2)
      .click();

    cy.get('@saveFormData.all').should('have.length', 1);

    cy.findAllByRole('radio', { name: /middels/i })
      .eq(0)
      .should('be.checked');
    cy.findAllByRole('radio', { name: /i liten grad/i })
      .eq(1)
      .should('be.checked');
    cy.findAllByRole('radio', { name: /i stor grad/i })
      .eq(2)
      .should('be.checked');
  });

  it('Dynamic options', () => {
    cy.intercept('PATCH', '**/data*').as('saveFormData');
    cy.gotoNavPage('Side2');

    // The 'choose-sector' radio component has a 'preselectedOptionIndex' which will auto-select an option before
    // we get a chance to interact with it ourselves, thus an initial save will happen.
    cy.get('@saveFormData.all').should('have.length', 1);

    cy.findByRole('radio', { name: /offentlig sektor/i }).click();
    cy.get('@saveFormData.all').should('have.length', 2);

    cy.findByRole('checkbox', { name: /statlig/i }).click();
    cy.get('@saveFormData.all').should('have.length', 3);
    cy.get('@saveFormData.all').should(haveTheSameUrls);

    cy.findByRole('radio', { name: /privat/i }).click();
    cy.findByRole('checkbox', { name: /petroleum og engineering/i }).should('exist');

    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length.at.least', 4);
    cy.get('@saveFormData.all').should('have.length.at.most', 5);
    cy.get('@saveFormData.all').should(haveTheSameUrls);

    cy.findByRole('checkbox', { name: /petroleum og engineering/i }).click();
    cy.findByRole('alert', { name: /olje er ikke bra for planeten/i }).should('be.visible');
  });
});

function haveTheSameUrls(subject: unknown) {
  const interceptions = subject as Interception[];
  const urls = new Set(interceptions.map((i) => i.request.url));
  expect(urls.size).to.be.eq(1);
}
