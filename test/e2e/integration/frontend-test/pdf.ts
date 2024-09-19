import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Likert } from 'test/e2e/pageobjects/likert';

const appFrontend = new AppFrontend();
const likertPage = new Likert();

describe('PDF', () => {
  it('should generate PDF for message step', () => {
    cy.goto('message');

    cy.testPdf('message', () => {
      cy.findByRole('heading', { level: 1, name: /frontend-test/i }).should('be.visible');
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.findByRole('heading', { level: 2, name: /appen for test av app frontend/i }).should('be.visible');
      cy.findByRole('heading', { level: 2, name: /vedlegg/i }).should('be.visible');
    });
  });

  it('should generate PDF for changename step', () => {
    cy.interceptLayout(
      'changename',
      (component) => {
        if (component.type === 'Map' && component.id === 'map') {
          component.layers = [
            {
              // Since we are only doing a direct snapshot and not a 'real' percy snapshot we can get away with using a fake intercepted url
              url: '/map-tile/{z}/{y}/{x}',
              attribution: '&copy; <a href="about:blank">Team Apps</a>',
            },
          ];
        }

        if (component.type === 'Input' && component.id === 'map-location') {
          component.hidden = false;
        }
      },
      undefined,
      {}, // intercept this every time
    );

    // Add a delay to simulate slow loading map tiles
    cy.intercept('GET', '/map-tile/**', { delay: 50, fixture: 'map-tile.png' });

    cy.goto('changename');

    cy.findByRole('textbox', { name: /nytt fornavn/i }).type('Ola');
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).type('"Big G"');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.findByRole('textbox', { name: /nytt etternavn/i }).type('Nordmann');
    cy.findByRole('checkbox', { name: /ja, jeg bekrefter/i }).check();
    cy.findByRole('radio', { name: /adoptivforelders/i }).check();
    cy.findByRole('textbox', { name: /når vil du at/i }).type('01012020');
    cy.findByRole('textbox', { name: /mobil nummer/i }).type('98765432');
    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Sophie Salt');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Dole');
    cy.findByRole('textbox', { name: /Adresse/i }).type('Økern 1');
    cy.findByRole('textbox', { name: /Zip Code/i }).type('0101');
    cy.findByRole('textbox', { name: /Post Place/i }).should('have.value', 'OSLO');

    cy.testPdf(
      'changeName 1',
      () => {
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
      },
      true,
    );

    cy.findByRole('radio', { name: /gårdsbruk/i }).check();
    cy.findByRole('textbox', { name: /gårdsbruk du vil ta navnet fra/i }).type('Økern gård');
    cy.findByRole('textbox', { name: /kommune gårdsbruket ligger i/i }).type('4444');
    cy.findByRole('textbox', { name: /gårdsnummer/i }).type('1234');
    cy.findByRole('textbox', { name: /bruksnummer/i }).type('56');
    cy.findByRole('textbox', { name: /forklar din tilknytning til gårdsbruket/i }).type('Gris');
    cy.dsSelect(appFrontend.changeOfName.sources, 'Altinn');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Ole');

    cy.get('#choose-extra').findByText('Kart').click();
    cy.gotoNavPage('map');
    // Set exact location so snapshot is consistent
    cy.findByRole('textbox', { name: /eksakt lokasjon/i }).type('67.140824,16.101665');
    cy.waitUntilSaved();
    cy.gotoNavPage('form'); // Go back to form to avoid waiting for map to load while zoom animation is happending

    cy.testPdf('changeName 2', () => {
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
      cy.getSummary('Velg lokasjon').findByAltText('Marker').should('be.visible');
      cy.getSummary('Velg lokasjon')
        .findByText(/Valgt lokasjon: 67(\.\d{1,6})?° nord, 16(\.\d{1,6})?° øst/)
        .should('be.visible');
    });
  });

  it('should generate PDF for group step', () => {
    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).check();
    cy.findByRole('checkbox', { name: /middels/i }).check();
    cy.findByRole('checkbox', { name: /stor/i }).check();

    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).check();

    cy.get(appFrontend.group.edit).first().click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).comments).type('Dette er en kommentar');
    cy.get(appFrontend.group.edit).first().click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.get(appFrontend.group.edit).eq(1).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.get(appFrontend.group.edit).eq(1).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.gotoNavPage('hide');
    cy.findByRole('textbox', { name: /oppgave giver/i }).type('Ola Nordmann');

    cy.testPdf('group', () => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');

      cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 1');
      cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 1 til : NOK 5');

      cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 120');
      cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 120 til : NOK 350');

      cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 1 233');
      cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 1233 til : NOK 3 488');
    });
  });

  it('should generate PDF for likert step', () => {
    cy.goto('likert');
    cy.findByRole('table', { name: likertPage.optionalTableTitle }).within(() => {
      likertPage.optionalQuestions.forEach((question, index) => {
        likertPage.selectRadio(question, likertPage.options[index]);
      });
    });
    cy.findByRole('table', { name: likertPage.requiredTableTitle }).within(() => {
      likertPage.requiredQuestions.forEach((question, index) => {
        likertPage.selectRadio(`${question} *`, likertPage.options[index]);
      });
    });

    cy.testPdf('likert', () => {
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

    cy.testPdf('datalist', () => {
      cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
      cy.getSummary('Hvem gjelder saken?').should('contain.text', 'Caroline');
    });
  });

  it('should use custom PDF if set', () => {
    const pdfLayoutName = 'CustomPDF';

    cy.intercept('GET', '**/layoutsettings/**', (req) => {
      req.continue((res) => {
        const body = JSON.parse(res.body);
        res.body = JSON.stringify({
          ...body,
          pages: { ...body.pages, pdfLayoutName },
        });
      });
    });

    cy.intercept('GET', '**/layouts/**', (req) => {
      req.continue((res) => {
        const body = JSON.parse(res.body);
        res.body = JSON.stringify({
          ...body,
          [pdfLayoutName]: {
            data: {
              layout: [
                {
                  id: 'title',
                  type: 'Header',
                  textResourceBindings: { title: 'This is a custom PDF' },
                  size: 'L',
                },
              ],
            },
          },
        });
      });
    });

    cy.goto('changename');

    cy.testPdf(false, () => {
      cy.findByRole('heading', { name: /this is a custom pdf/i }).should('be.visible');
    });
  });

  // Used to cause a crash, @see https://github.com/Altinn/app-frontend-react/pull/2019
  it('Grid in Group should display correctly', () => {
    cy.intercept('GET', '**/layouts/**', (req) => {
      req.continue((res) => {
        const body = JSON.parse(res.body);
        res.body = JSON.stringify({
          ...body,
          grid: {
            ...body.grid,
            data: {
              ...body.grid.data,
              layout: [
                {
                  id: 'gridGroup',
                  type: 'Group',
                  textResourceBindings: {
                    title: 'Grid gruppe',
                  },
                  children: ['page3-grid'],
                },
                ...body.grid.data.layout,
              ],
            },
          },
        });
      });
    });

    cy.goto('changename');

    cy.testPdf(false, () => {
      cy.findByRole('heading', { name: /grid gruppe/i }).should('be.visible');
      cy.findByText('Prosentandel av gjeld i boliglån').should('be.visible');
      cy.findByText('Utregnet totalprosent').should('be.visible');
    });
  });
});
