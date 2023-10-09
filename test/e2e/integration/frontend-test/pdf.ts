import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Likert } from 'test/e2e/pageobjects/likert';

const appFrontend = new AppFrontend();
const likertPage = new Likert();

describe('PDF', () => {
  it('should generate PDF for message step', () => {
    cy.goto('message');

    cy.testPdf(() => {
      cy.findByRole('heading', { level: 1, name: /frontend-test/i }).should('be.visible');
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.findByRole('heading', { level: 2, name: /appen for test av app frontend/i }).should('be.visible');
      cy.findByRole('heading', { level: 2, name: /vedlegg/i }).should('be.visible');
    });
  });

  it('should generate PDF for changename step', () => {
    cy.goto('changename');

    cy.findByRole('textbox', { name: /nytt fornavn/i }).type('Ola');
    cy.findByRole('textbox', { name: /nytt etternavn/i }).type('Nordmann');
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).type('"Big G"');
    cy.findByRole('checkbox', { name: /ja, jeg bekrefter/i }).dsCheck();
    cy.findByRole('radio', { name: /adoptivforelders/i }).dsCheck();
    cy.findByRole('textbox', { name: /når vil du at/i }).type('01012020');
    cy.findByRole('textbox', { name: /mobil nummer/i }).type('98765432');
    cy.get(appFrontend.changeOfName.sources).dsSelect('Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference).dsSelect('Sophie Salt');
    cy.get(appFrontend.changeOfName.reference2).dsSelect('Dole');
    cy.findByRole('textbox', { name: /gateadresse/i }).type('Økern 1');
    cy.findByRole('textbox', { name: /postnr/i }).type('0101');
    cy.findByRole('textbox', { name: /poststed/i }).should('have.value', 'OSLO');

    cy.testPdf(() => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.getSummary('Nytt fornavn').should('contain.text', 'Ola');
      cy.getSummary('Nytt etternavn').should('contain.text', 'Nordmann');
      cy.getSummary('Nytt mellomnavn').should('contain.text', '"Big G"');
      cy.getSummary('Til:').should('contain.text', 'Ola "Big G" Nordmann');
      cy.getSummary('begrunnelse for endring av navn').should('contain.text', 'Adoptivforelders etternavn');
      cy.getSummary('Gårdsbruk du vil ta navnet fra').should('not.exist');
      cy.getSummary('Kommune gårdsbruket ligger i').should('not.exist');
      cy.getSummary('Gårdsnummer').should('not.exist');
      cy.getSummary('Bruksnummer').should('not.exist');
      cy.getSummary('Forklar din tilknytning til gårdsbruket').should('not.exist');
      cy.getSummary('Når vil du at navnendringen').should('contain.text', '01/01/2020');
      cy.getSummary('Mobil nummer').should('contain.text', '+47 987 65 432');
      cy.getSummary('hvor fikk du vite om skjemaet').should('contain.text', 'Digitaliseringsdirektoratet');
      cy.getSummary('Referanse').should('contain.text', 'Sophie Salt');
      cy.getSummary('Referanse 2').should('contain.text', 'Dole');
      cy.getSummary('Adresse').should('contain.text', 'Økern 1');
    }, true);

    cy.findByRole('radio', { name: /gårdsbruk/i }).dsCheck();
    cy.findByRole('textbox', { name: /gårdsbruk du vil ta navnet fra/i }).type('Økern gård');
    cy.findByRole('textbox', { name: /kommune gårdsbruket ligger i/i }).type('4444');
    cy.findByRole('textbox', { name: /gårdsnummer/i }).type('1234');
    cy.findByRole('textbox', { name: /bruksnummer/i }).type('56');
    cy.findByRole('textbox', { name: /forklar din tilknytning til gårdsbruket/i }).type('Gris');
    cy.get(appFrontend.changeOfName.sources).dsSelect('Altinn');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference).dsSelect('Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference2).dsSelect('Ole');

    cy.testPdf(() => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.getSummary('Nytt fornavn').should('contain.text', 'Ola');
      cy.getSummary('Nytt etternavn').should('contain.text', 'Nordmann');
      cy.getSummary('Nytt mellomnavn').should('contain.text', '"Big G"');
      cy.getSummary('Til:').should('contain.text', 'Ola "Big G" Nordmann');
      cy.getSummary('begrunnelse for endring av navn').should('contain.text', 'Gårdsbruk');
      cy.getSummary('Gårdsbruk du vil ta navnet fra').should('contain.text', 'Økern gård');
      cy.getSummary('Kommune gårdsbruket ligger i').should('contain.text', '4444');
      cy.getSummary('Gårdsnummer').should('contain.text', '1234');
      cy.getSummary('Bruksnummer').should('contain.text', '56');
      cy.getSummary('Forklar din tilknytning til gårdsbruket').should('contain.text', 'Gris');
      cy.getSummary('Når vil du at navnendringen').should('contain.text', '01/01/2020');
      cy.getSummary('Mobil nummer').should('contain.text', '+47 987 65 432');
      cy.getSummary('hvor fikk du vite om skjemaet').should('contain.text', 'Altinn');
      cy.getSummary('Referanse').should('contain.text', 'Ola Nordmann');
      cy.getSummary('Referanse 2').should('contain.text', 'Ole');
      cy.getSummary('Adresse').should('contain.text', 'Økern 1');
    });
  });

  it('should generate PDF for group step', () => {
    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).dsCheck();
    cy.findByRole('checkbox', { name: /middels/i }).dsCheck();
    cy.findByRole('checkbox', { name: /stor/i }).dsCheck();

    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).dsCheck();

    cy.get(appFrontend.group.edit).first().click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get('#source-0').dsSelect('Digitaliseringsdirektoratet');
    cy.get('#reference-0').should('have.value', '');
    cy.get('#reference-0').dsSelect('Sophie Salt');
    cy.get(appFrontend.group.edit).first().click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.get(appFrontend.group.edit).eq(1).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get('#source-1').dsSelect('Altinn');
    cy.get('#reference-1').should('have.value', '');
    cy.get('#reference-1').dsSelect('Ola Nordmann');
    cy.get(appFrontend.group.edit).eq(1).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.gotoNavPage('hide');
    cy.findByRole('textbox', { name: /oppgave giver/i }).type('Ola Nordmann');

    cy.testPdf(() => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');

      cy.getSummary('Group title').should('contain.text', 'Endre fra : NOK 1');
      cy.getSummary('Group title').should('contain.text', 'Endre verdi 1 til  : NOK 5');
      cy.getSummary('Group title').should(
        'contain.text',
        'hvor fikk du vite om skjemaet? : Digitaliseringsdirektoratet',
      );
      cy.getSummary('Group title').should('contain.text', 'Referanse : Sophie Salt');

      cy.getSummary('Group title').should('contain.text', 'Endre fra : NOK 120');
      cy.getSummary('Group title').should('contain.text', 'Endre verdi 120 til  : NOK 350');
      cy.getSummary('Group title').should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
      cy.getSummary('Group title').should('contain.text', 'Referanse : Ola Nordmann');

      cy.getSummary('Group title').should('contain.text', 'Endre fra : NOK 1 233');
      cy.getSummary('Group title').should('contain.text', 'Endre verdi 1233 til  : NOK 3 488');
      cy.getSummary('Group title').should(
        'contain.text',
        'hvor fikk du vite om skjemaet? : Du har ikke lagt inn informasjon her',
      );
      cy.getSummary('Group title').should('contain.text', 'Referanse : Du har ikke lagt inn informasjon her');
    });
  });

  it('should generate PDF for likert step', () => {
    cy.goto('likert');
    likertPage.selectOptionalRadios();
    likertPage.selectRequiredRadios();

    cy.testPdf(() => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');

      cy.getSummary('Skolearbeid').should('contain.text', 'Gjør du leksene dine? : Alltid');
      cy.getSummary('Skolearbeid').should('contain.text', 'Fungerer kalkulatoren din? : Nesten alltid');
      cy.getSummary('Skolearbeid').should('contain.text', 'Er pulten din ryddig? : Ofte');

      cy.getSummary('Medvirkning').should('contain.text', 'Hører skolen på elevenes forslag? : Alltid');
      cy.getSummary('Medvirkning').should(
        'contain.text',
        'Er dere elever med på å lage regler for hvordan dere skal ha det i klassen/gruppa? : Nesten alltid',
      );
      cy.getSummary('Medvirkning').should(
        'contain.text',
        'De voksne på skolen synes det er viktig at vi elever er greie med hverandre. : Ofte',
      );
    });
  });

  it('should generate PDF for datalist step', () => {
    cy.gotoAndComplete('datalist');

    cy.testPdf(() => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.getSummary('Hvem gjelder saken?').should('contain.text', 'Caroline');
    });
  });
});
