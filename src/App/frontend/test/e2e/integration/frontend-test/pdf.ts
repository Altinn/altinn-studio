import type { Interception } from 'cypress/types/net-stubbing';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Likert } from 'test/e2e/pageobjects/likert';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

const appFrontend = new AppFrontend();
const likertPage = new Likert();

describe('PDF', () => {
  it('should generate PDF for message step', { retries: 0 }, () => {
    cy.goto('message');
    cy.get('#finishedLoading').should('exist');

    cy.testPdf({
      snapshotName: 'message',
      enableResponseFuzzing: true,
      callback: () => {
        cy.findByRole('heading', { level: 1, name: /frontend-test/i }).should('be.visible');
        cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
        cy.findByRole('heading', { level: 2, name: /appen for test av app frontend/i }).should('be.visible');
        cy.findByRole('heading', { level: 2, name: /vedlegg/i }).should('be.visible');
      },
    });
  });

  it('downstream requests includes trace context header', { retries: 0 }, () => {
    const traceparentValue = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const tracestateValue = 'altinn';
    const domain = new URL(Cypress.config().baseUrl!).hostname;
    const cookieOptions: Partial<Cypress.SetCookieOptions> = { domain, sameSite: 'lax' };

    cy.goto('message');
    cy.get('#finishedLoading').should('exist');

    cy.testPdf({
      beforeReload: () => {
        cy.setCookie('altinn-telemetry-traceparent', traceparentValue, cookieOptions);
        cy.setCookie('altinn-telemetry-tracestate', tracestateValue, cookieOptions);
        cy.intercept({
          url: new RegExp(domain),
          headers: {
            cookie: new RegExp('altinn-telemetry-traceparent='),
          },
          resourceType: 'xhr',
        }).as('allRequests');
      },
      callback: () => {
        cy.get('@allRequests.all').then((_intercepts) => {
          const intercepts = _intercepts as unknown as Interception[];
          expect(intercepts.length).to.be.greaterThan(9);
          for (const intercept of intercepts) {
            const { request } = intercept;
            const reqInfo = `${intercept.browserRequestId} ${intercept.routeId} ${request.method} ${request.url.split(domain)[1]}`;
            cy.log('Request intercepted:', reqInfo);
            expect(request.headers, `request headers ${reqInfo}`).to.include({
              'x-altinn-ispdf': 'true',
              traceparent: traceparentValue,
              tracestate: tracestateValue,
            });
          }
        });
      },
    });
  });

  it('should generate PDF for changename step', { retries: 0 }, () => {
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

    cy.intercept('GET', '/map-tile/**', { fixture: 'map-tile.png' });

    cy.goto('changename');

    cy.findByRole('textbox', { name: /nytt fornavn/i }).type('Ola');
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).type('"Big G"');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.findByRole('textbox', { name: /nytt etternavn/i }).type('Nordmann');
    cy.findByRole('checkbox', { name: /ja, jeg bekrefter/i }).check();
    cy.findByRole('radio', { name: /adoptivforelders/i }).check();
    cy.findByRole('textbox', { name: /når vil du at/i }).type('01/01/2020');
    cy.findByRole('textbox', { name: /mobilnummer/i }).type('98765432');
    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Sophie Salt');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Dole');
    cy.findByRole('textbox', { name: /Adresse/i }).type('Økern 1');
    cy.findByRole('textbox', { name: /Zip Code/i }).type('0101');
    cy.findByRole('textbox', { name: /Post Place/i }).should('have.value', 'OSLO');

    cy.testPdf({
      snapshotName: 'changeName 1',
      returnToForm: true,
      enableResponseFuzzing: true,
      callback: () => {
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
        cy.getSummary('Mobilnummer').should('contain.text', '+47 987 65 432');
        cy.getSummary('hvor fikk du vite om skjemaet').should('contain.text', 'Digitaliseringsdirektoratet');
        cy.getSummary('Referanse').should('contain.text', 'Sophie Salt');
        cy.getSummary('Referanse 2').should('contain.text', 'Dole');
        cy.getSummary('Adresse').should('contain.text', 'Økern 1');
      },
    });

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

    cy.testPdf({
      snapshotName: 'changeName 2',
      callback: () =>
        // prettier-ignore
        {
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
        cy.getSummary('Mobilnummer').should('contain.text', '+47 987 65 432');
        cy.getSummary('hvor fikk du vite om skjemaet').should('contain.text', 'Altinn');
        cy.getSummary('Referanse').should('contain.text', 'Ola Nordmann');
        cy.getSummary('Referanse 2').should('contain.text', 'Ole');
        cy.getSummary('Adresse').should('contain.text', 'Økern 1');
        cy.getSummary('Velg lokasjon').findByRole('img', { name: 'Marker', description: '' }).should('be.visible');
        cy.getSummary('Velg lokasjon').findByRole('tooltip', { name: 'Hankabakken 4' }).should('be.visible');
        cy.getSummary('Velg lokasjon').findByRole('img', { name: 'Marker', description: 'Hankabakken 6' }).should('be.visible');
        cy.getSummary('Velg lokasjon').findByRole('tooltip', { name: 'Hankabakken 6' }).should('be.visible');
        cy.getSummary('Velg lokasjon').findByText(/Valgt lokasjon: 67(\.\d{1,6})?° nord, 16(\.\d{1,6})?° øst/).should('be.visible');
      },
    });
  });

  it('should generate PDF for group step', { retries: 0 }, () => {
    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).check();
    cy.findByRole('checkbox', { name: /middels/i }).check();
    cy.findByRole('checkbox', { name: /stor/i }).check();

    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).check();

    cy.findByRole('button', { name: 'Se innhold NOK 1' }).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).comments).type('Dette er en kommentar');
    cy.findByRole('button', { name: 'Lukk NOK 1' }).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.findByRole('button', { name: 'Se innhold NOK 120' }).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).first().click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).should('be.visible');
    cy.findByRole('button', { name: 'Lukk NOK 120' }).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.gotoNavPage('hide');
    cy.findByRole('textbox', { name: /oppgave giver/i }).type('Ola Nordmann');

    cy.testPdf({
      snapshotName: 'group',
      enableResponseFuzzing: true,
      callback: () => {
        cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');

        cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 1');
        cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 1 til : NOK 5');

        cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 120');
        cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 120 til : NOK 350');

        cy.getSummary('Group summary title').should('contain.text', 'Endre fra : NOK 1 233');
        cy.getSummary('Group summary title').should('contain.text', 'Endre verdi 1233 til : NOK 3 488');
      },
    });
  });

  it('should generate PDF for group step (using Summary1 pdfLayout)', { retries: 0 }, () => {
    cy.intercept('GET', '**/api/layoutsettings/group', (req) => {
      req.on('response', (res) => {
        const body = JSON.parse(res.body) as ILayoutSettings;
        body.pages.pdfLayoutName = 'summary'; // Forces PDF engine to use the 'summary' page as the PDF page
        res.send(body);
      });
    }).as('settings');

    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).check();
    cy.findByRole('checkbox', { name: /middels/i }).check();
    cy.findByRole('checkbox', { name: /stor/i }).check();
    cy.findByRole('checkbox', { name: /svær/i }).check();
    cy.findByRole('checkbox', { name: /enorm/i }).check();

    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).check();

    cy.interceptLayout('group', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.pageBreak = {
          breakBefore: 'always',
          breakAfter: 'auto',
        };
      }
    });

    cy.testPdf({
      freeze: false,
      snapshotName: 'group-custom-summary1',
      callback: () => {
        // Regression test for https://github.com/Altinn/app-frontend-react/issues/3745
        cy.expectPageBreaks(6);
      },
    });
  });

  it('should generate PDF for group step (using Summary2 automatic PDF)', { retries: 0 }, () => {
    cy.setFeatureToggle('betaPDFenabled', true);
    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).check();
    cy.findByRole('checkbox', { name: /middels/i }).check();
    cy.findByRole('checkbox', { name: /stor/i }).check();
    cy.findByRole('checkbox', { name: /svær/i }).check();
    cy.findByRole('checkbox', { name: /enorm/i }).check();

    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).check();

    cy.interceptLayout('group', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.pageBreak = {
          breakBefore: 'always',
          breakAfter: 'auto',
        };
      }
    });

    cy.testPdf({
      freeze: false,
      snapshotName: 'group-custom-summary2',
      callback: () => {
        // Summary2 doesn't do page-breaks per row, only for the component itself
        cy.expectPageBreaks(1);
      },
    });
  });

  it('should generate PDF for likert step', { retries: 0 }, () => {
    cy.goto('likert');
    cy.findByRole('table', { name: likertPage.optionalTableTitle }).within(() => {
      likertPage.optionalQuestions.forEach((question, index) => {
        likertPage.selectRadioDesktop(question, likertPage.options[index]);
      });
    });
    cy.findByRole('table', { name: likertPage.requiredTableTitle }).within(() => {
      likertPage.requiredQuestions.forEach((question, index) => {
        likertPage.selectRadioDesktop(`${question} *`, likertPage.options[index]);
      });
    });

    cy.testPdf({
      snapshotName: 'likert',
      enableResponseFuzzing: true,
      callback: () => {
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
      },
    });
  });

  it('should generate PDF for datalist step', { retries: 0 }, () => {
    // Removing Summary2 page. That page references previous tasks and data models in previous tasks that won't even
    // be created when we skip over those previous tasks by calling gotoAndComplete(). Not removing that page would
    // simply crash the whole PDF generation.
    cy.intercept('GET', '**/layoutsettings/**', (req) =>
      req.on('response', (res) => {
        const body: { pages: { order: string[] } } = JSON.parse(res.body);
        body.pages.order = body.pages.order.filter((page) => page !== 'summary2');
        res.send(body);
      }),
    );
    cy.gotoAndComplete('datalist');

    cy.testPdf({
      snapshotName: 'datalist',
      enableResponseFuzzing: true,
      callback: () => {
        cy.findByRole('table').should('contain.text', 'Mottaker:Testdepartementet');
        cy.getSummary('Hvem gjelder saken?').should('contain.text', 'Caroline');
      },
    });
  });

  it('should use custom PDF if set', { retries: 0 }, () => {
    const pdfLayoutName = 'CustomPDF';

    cy.intercept('GET', '**/layoutsettings/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutSettings = JSON.parse(res.body);
        res.send({
          ...body,
          pages: { ...body.pages, pdfLayoutName },
        });
      }),
    );

    cy.intercept('GET', '**/layouts/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutCollection = JSON.parse(res.body);
        res.send({
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
                {
                  id: 'datalist',
                  type: 'Summary2',
                  target: {
                    taskId: 'Task_5',
                    type: 'layoutSet',
                  },
                  showPageInAccordion: false,
                },
              ],
            },
          },
        });
      }),
    );

    cy.gotoAndComplete('datalist');

    cy.testPdf({
      callback: () => {
        cy.findByRole('heading', { name: /this is a custom pdf/i }).should('be.visible');
        cy.getSummary('Hvem gjelder saken?').should('contain.text', 'Caroline');
      },
    });
  });

  it('should fail if custom PDF is not found', () => {
    // The PlainPage component should throw an error if the custom PDF layout is not found,
    // so we don't want to fail the test when that happens
    cy.allowFailureOnEnd();
    cy.ignoreConsoleMessages([/Error using: "pdfLayoutName"/, /The above error occurred in the <PlainPage> component/]);
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error using: "pdfLayoutName"')) {
        return false;
      }
    });

    cy.intercept('GET', '**/layoutsettings/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutSettings = JSON.parse(res.body);
        res.send({
          ...body,
          pages: { ...body.pages, pdfLayoutName: 'incorrect-pdf-layout-name' },
        });
      }),
    );

    cy.goto('message');

    // Wait for page to load
    cy.get('#finishedLoading').should('exist');
    cy.waitForNetworkIdle(500);

    // Visit the PDF page and reload
    cy.location('href').then((href) => {
      const regex = getInstanceIdRegExp();
      const instanceId = regex.exec(href)?.[1];
      const before = href.split(regex)[0];
      const visitUrl = `${before}${instanceId}?pdf=1`;
      cy.visit(visitUrl);
    });
    cy.reload();

    // Wait for page to load
    cy.get('#finishedLoading').should('exist');
    cy.waitForNetworkIdle(500);

    // Check that we are on the error page and that #readyForPrint is not present
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('exist');
    cy.get('#readyForPrint').should('not.exist');
  });

  // Used to cause a crash, @see https://github.com/Altinn/app-frontend-react/pull/2019
  it('Grid in Group should display correctly', { retries: 0 }, () => {
    cy.intercept('GET', '**/layouts/**', (req) => {
      req.on('response', (res) => {
        const body: ILayoutCollection = JSON.parse(res.body);
        res.send({
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
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible');
    cy.waitUntilSaved();

    cy.testPdf({
      callback: () => {
        cy.findByRole('heading', { name: /grid gruppe/i }).should('be.visible');
        cy.findByText('Prosentandel av gjeld i boliglån').should('be.visible');
        cy.findByText('Utregnet totalprosent').should('be.visible');
      },
    });
  });

  it('should not show "#readyForPrint" on unknown error', () => {
    cy.goto('message');

    // Wait for page to load
    cy.get('#finishedLoading').should('exist');

    // This should provoke an unknown error. It used to intercept form data, but failures in loading form data from
    // FormDataReaders (used from text resources) do not lead to errors, so this test could become flaky when that
    // was the first request out of the gate.
    cy.intercept('GET', '**/process', (req) => req.reply({ statusCode: 404, body: 'Not Found' })).as('failing');

    // Visit the PDF page and reload
    cy.location('href').then((href) => {
      const regex = getInstanceIdRegExp();
      const instanceId = regex.exec(href)?.[1];
      const before = href.split(regex)[0];
      const visitUrl = `${before}${instanceId}?pdf=1`;
      cy.visit(visitUrl);
      cy.reload();
    });

    // Check that we are on the error page and that #readyForPrint is not present
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('exist');
    cy.get('#readyForPrint').should('not.exist');
    cy.get('#finishedLoading').should('not.exist');
    cy.allowFailureOnEnd();
  });
});
