import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const NAVIGATION_COMPONENT = '[data-testid=page-navigation]';
const NAVIGATION_TRIGGER = '[data-testid=page-navigation-trigger]';
const ICON_COMPLETE = '[data-testid=state-complete]';
const ICON_ERROR = '[data-testid=state-error]';

describe('navigation', () => {
  const viewportSizes = {
    desktop: { width: 1440, height: 900 }, // Laptop
    tablet: { width: 810, height: 1080 }, // iPad
    mobile: { width: 375, height: 812 }, // iPhone mini
  };

  ['desktop', 'tablet', 'mobile'].forEach((device: keyof typeof viewportSizes) =>
    it(`navigation component on ${device}`, () => {
      const { width, height } = viewportSizes[device];
      const isUsingMobile = device === 'mobile';
      const isUsingTablet = device === 'tablet';
      cy.viewport(width, height);
      cy.startAppInstance(appFrontend.apps.navigationTest);
      cy.waitForLoad();

      // Check initial conditions
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, /Generell info/).should('have.attr', 'aria-current', 'page');
      cy.navGroup(/^Informasjon/, /Litt mer info/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Utfylling/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/Utfylling/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Viktig informasjon/).should('not.have.attr', 'aria-expanded');
      cy.navGroup(/Viktig informasjon/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Innsending/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/Innsending/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Bekreftelse/).should('be.disabled');
      cy.navGroup(/Bekreftelse/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Kvittering/).should('be.disabled');
      cy.navGroup(/Kvittering/).should('not.have.attr', 'aria-current');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, /Generell info/).should('not.have.attr', 'aria-current');
      cy.navGroup(/^Informasjon/, /Litt mer info/).should('have.attr', 'aria-current', 'page');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/^Informasjon/).should('not.have.attr', 'aria-current');

      cy.navGroup(/Utfylling/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/Utfylling/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/Utfylling/, /Fornavn/).should('have.attr', 'aria-current', 'page');
      cy.navGroup(/Utfylling/, /Fornavn/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Etternavn/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_ERROR)
        .should('not.exist');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('textbox', { name: /Fornavn/ }).type('Donald');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Etternavn/ }).type('Duck');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/Utfylling/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/Utfylling/, /Fornavn/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Etternavn/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Alder/).should('have.attr', 'aria-current', 'page');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('textbox', { name: /Alder/ }).type('123');
      cy.get(appFrontend.errorReport).should('be.visible');

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_ERROR)
        .should('not.exist');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Fødselsdag/).should('have.attr', 'aria-current', 'page');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_ERROR)
        .should('be.visible');
      cy.readFile('test/percy.css').then((percyCSS) => {
        cy.testWcag();
        if (device === 'mobile') {
          cy.percySnapshot(`navigation:page-states (${device})`, { percyCSS, widths: [width] });
        }
      });
      cy.gotoNavGroup(/^Informasjon/, device, /Generell info/);

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, /Generell info/).should('have.attr', 'aria-current', 'page');
      cy.navGroup(/Utfylling/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/Utfylling/).should('not.have.attr', 'aria-current');
      cy.navGroup(/Utfylling/)
        .find(ICON_ERROR)
        .should('be.visible');
      cy.gotoNavGroup(/Utfylling/, device, /Alder/);

      cy.findByRole('textbox', { name: /Alder/ }).clear();
      cy.findByRole('textbox', { name: /Alder/ }).type('42');
      cy.get(appFrontend.errorReport).should('not.exist');

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Kjøretøy/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Kjøretøy/)
        .find(ICON_ERROR)
        .should('not.exist');
      cy.gotoNavGroup(/Utfylling/, device, /Kjøretøy/);

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_ERROR)
        .should('not.exist');
      cy.gotoNavGroup(/Utfylling/, device, /Fødselsdag/);

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Kjøretøy/)
        .find(ICON_COMPLETE)
        .should('not.exist');
      cy.navGroup(/Utfylling/, /Kjøretøy/)
        .find(ICON_ERROR)
        .should('not.exist');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('textbox', { name: /Fødselsdag/ }).type('09061934');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Legg til ny' }).click();
      cy.findByRole('textbox', { name: /E-post/ }).type('donald.duck@altinn.no');
      cy.findByRole('button', { name: 'Legg til ny' }).click();
      cy.findAllByRole('textbox', { name: /E-post/ })
        .eq(1)
        .type('donald.duck@digdir.no');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Legg til bil' }).clickAndGone();
      cy.waitForLoad();
      cy.findByRole('textbox', { name: /Registreringsnummer/ }).should('be.visible');

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Registreringsnummer/).should('have.attr', 'aria-current', 'page');
      cy.navGroup(/Registreringsnummer/).should('not.have.attr', 'aria-expanded');
      cy.navGroup(/Informasjon/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/Informasjon/).should('not.have.attr', 'aria-current');
      cy.openNavGroup(/Informasjon/);
      cy.navGroup(/Informasjon/, /Merke/).should('not.have.attr', 'aria-current');
      cy.navGroup(/Informasjon/, /Årsmodell/).should('not.have.attr', 'aria-current');
      cy.navGroup(/Bekreftelse/).should('not.exist');
      cy.navGroup(/Kvittering/).should('not.exist');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: /Kjøretøy$/ }).clickAndGone();
      cy.waitForLoad();
      cy.findByRole('button', { name: 'Legg til bil' }).should('be.visible');
      cy.findByRole('button', { name: 'Slett' }).clickAndGone();
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/Utfylling/).should('not.have.attr', 'aria-current');
      cy.navGroup(/Utfylling/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.openNavGroup(/Innsending/);
      cy.navGroup(/Innsending/, /Tilbakemelding/).should('be.visible');
      cy.navGroup(/Innsending/, /Oppsummering/).should('be.visible');
      cy.gotoNavGroup(/Utfylling/, device, /Ekstra/);

      cy.findByRole('checkbox', { name: 'Skjul tilbakemelding' }).dsCheck();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.openNavGroup(/Innsending/);
      cy.navGroup(/Innsending/, /Tilbakemelding/).should('not.exist');
      cy.navGroup(/Innsending/, /Oppsummering/).should('be.visible');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();
      cy.findByRole('checkbox', { name: 'Skjul oppsummering' }).dsCheck();
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Innsending/).should('not.exist');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('heading', { name: 'Viktig informasjon' }).should('be.visible');
      cy.findByRole('button', { name: 'Neste' }).should('not.exist');
      cy.findByRole('button', { name: 'Forrige' }).clickAndGone();
      cy.findByRole('checkbox', { name: 'Skjul oppsummering' }).dsUncheck();
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('heading', { name: 'Viktig informasjon' }).should('be.visible');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Send inn' }).clickAndGone();
      cy.findByRole('heading', { name: 'Se over svarene dine før du sender inn' }).should('be.visible');

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Personopplysninger/).should('be.disabled');
      cy.navGroup(/Personopplysninger/).should('not.have.attr', 'aria-current');
      cy.navGroup(/Bekreftelse/).should('be.disabled');
      cy.navGroup(/Bekreftelse/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/Kvittering/).should('be.disabled');
      cy.navGroup(/Kvittering/).should('not.have.attr', 'aria-current');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Send inn' }).clickAndGone();

      cy.findByRole('heading', { name: 'Skjemaet er sendt inn' }).should('be.visible');
      cy.get(NAVIGATION_COMPONENT).should('not.exist');
      cy.get(NAVIGATION_TRIGGER).should('not.exist');
    }),
  );

  ['desktop', 'tablet', 'mobile'].forEach((device: keyof typeof viewportSizes) =>
    it(`navigation with subform on ${device}`, () => {
      const { width, height } = viewportSizes[device];
      const isUsingMobile = device === 'mobile';
      const isUsingTablet = device === 'tablet';
      cy.viewport(width, height);
      cy.startAppInstance(appFrontend.apps.navigationTest);
      cy.waitForLoad();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.gotoNavGroup(/Utfylling/, device, /Fornavn/);
      cy.findByRole('textbox', { name: /Fornavn/ }).type('Skrue');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Etternavn/ }).type('McDuck');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Alder/ }).type('75');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Fødselsdag/ }).type('08071900');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Legg til ny' }).click();
      cy.findByRole('textbox', { name: /E-post/ }).type('skrue.mcduck@altinn.no');
      cy.findByRole('button', { name: 'Legg til ny' }).click();
      cy.findAllByRole('textbox', { name: /E-post/ })
        .eq(1)
        .type('skrue.mcduck@digdir.no');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Fornavn/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Etternavn/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Alder/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /Fødselsdag/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Utfylling/, /E-post/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();

      cy.findByRole('button', { name: 'Legg til bil' }).clickAndGone();
      cy.waitForLoad();
      cy.findByRole('textbox', { name: /Registreringsnummer/ }).type('AB12345');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.dsSelect('#brand', 'Toyota');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Årsmodell/ }).type('1998');

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Registreringsnummer/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.gotoNavGroup(/Registreringsnummer/, device);
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Informasjon/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.openNavGroup(/Informasjon/);
      cy.navGroup(/Informasjon/, /Merke/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.navGroup(/Informasjon/, /Årsmodell/)
        .find(ICON_COMPLETE)
        .should('be.visible');
      cy.gotoNavGroup(/Informasjon/, device, /Årsmodell/);
      cy.findByRole('button', { name: /Ferdig/ }).clickAndGone();
      cy.waitForLoad();

      cy.findByRole('button', { name: 'Legg til bil' }).clickAndGone();
      cy.waitForLoad();
      cy.findByRole('textbox', { name: /Registreringsnummer/ }).type('XY98765');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.dsSelect('#brand', 'Lamborghini');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Årsmodell/ }).type('2010');
      cy.findByRole('button', { name: /Ferdig/ }).clickAndGone();
      cy.waitForLoad();

      cy.get('#subform-subform-table tbody tr').should('have.length', 2);
      cy.get('#subform-subform-table tbody tr')
        .eq(0)
        .within(() => {
          cy.get('td').eq(0).should('have.text', '⟦AB12345⟧');
          cy.get('td').eq(1).should('have.text', 'Toyota');
          cy.get('td').eq(2).should('have.text', '1998');
        });
      cy.get('#subform-subform-table tbody tr')
        .eq(1)
        .within(() => {
          cy.get('td').eq(0).should('have.text', '⟦XY98765⟧');
          cy.get('td').eq(1).should('have.text', 'Lamborghini');
          cy.get('td').eq(2).should('have.text', '2010');
        });

      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.openNavGroup(/Utfylling/, /Kjøretøy/, /Biler/);
      cy.navGroup(/Utfylling/, /Kjøretøy/, /Biler/)
        .parent()
        .then((container) => {
          cy.findByRole('button', { name: 'En fet Toyota fra 1998', container }).should('be.visible');
          cy.findByRole('button', { name: 'En fet Lamborghini fra 2010', container }).should('be.visible');
        });

      cy.gotoNavGroup(/Informasjon/, device, /Generell info/);
      cy.findByText(/Punkt to er ikke like viktig/).should('be.visible');
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.openNavGroup(/Utfylling/, /Kjøretøy/, /Biler/);
      cy.findByRole('button', { name: 'En fet Toyota fra 1998' }).should('be.visible');

      cy.readFile('test/percy.css').then((percyCSS) => {
        cy.testWcag();
        cy.percySnapshot(`navigation:subform (${device})`, { percyCSS, widths: [width] });
      });

      cy.navGroup(/Utfylling/, /Kjøretøy/, /Biler/)
        .parent()
        .then((container) => {
          cy.findByRole('button', { name: 'En fet Lamborghini fra 2010', container }).clickAndGone();
        });
      cy.waitForLoad();
      cy.findByRole('textbox', { name: /Registreringsnummer/ }).should('have.value', 'XY98765');
      cy.findByRole('button', { name: /Kjøretøy$/ }).clickAndGone();
      cy.waitForLoad();
      cy.url().should('not.include', '?focusComponentId=subform&exitSubform=true');
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Kjøretøy/).should('have.attr', 'aria-current', 'page');
      cy.gotoNavGroup(/Innsending/, device, /Oppsummering/);

      cy.findByRole('heading', { name: 'En fet Toyota fra 1998' }).should('be.visible');
      cy.findByRole('heading', { name: 'En fet Lamborghini fra 2010' }).should('be.visible');
      cy.get('#subform-subform-table tbody tr').should('have.length', 2);
      cy.get('#subform-subform-table tbody tr')
        .eq(0)
        .within(() => {
          cy.get('td').eq(0).should('have.text', '⟦AB12345⟧');
          cy.get('td').eq(1).should('have.text', 'Toyota');
          cy.get('td').eq(2).should('have.text', '1998');
        });
      cy.get('#subform-subform-table tbody tr')
        .eq(1)
        .within(() => {
          cy.get('td').eq(0).should('have.text', '⟦XY98765⟧');
          cy.get('td').eq(1).should('have.text', 'Lamborghini');
          cy.get('td').eq(2).should('have.text', '2010');
        });

      cy.findByTestId('subform-summary-subform').children().eq(0).should('contain.text', '⟦AB12345⟧ — Toyota — 1998');
      cy.findByTestId('subform-summary-subform')
        .children()
        .eq(1)
        .should('contain.text', '⟦XY98765⟧ — Lamborghini — 2010');

      // Not a typo, this is different from the two above
      cy.findByTestId('summary-Summary-subform')
        .then((container) => cy.findByRole('button', { name: /Endre/, container }))
        .clickAndGone();
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Kjøretøy/).should('have.attr', 'aria-current', 'page');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();
      cy.findByRole('button', { name: 'Tilbake til oppsummering' }).clickAndGone();
      cy.findByText('skrue.mcduck@altinn.no').should('be.visible');

      cy.get('#subform-subform-table tbody tr')
        .eq(0)
        .then((container) => {
          cy.findByRole('button', { name: 'Endre', container }).clickAndGone();
        });
      cy.waitForLoad();
      cy.findByRole('textbox', { name: /Registreringsnummer/ }).should('have.value', 'AB12345');
      cy.findByRole('button', { name: /Kjøretøy$/ }).clickAndGone();
      cy.waitForLoad();
      cy.url().should('not.include', '?focusComponentId=subform&exitSubform=true');
      isUsingMobile && cy.showNavGroupsMobile();
      isUsingTablet && cy.showNavGroupsTablet();
      cy.navGroup(/Utfylling/, /Kjøretøy/).should('have.attr', 'aria-current', 'page');
      isUsingMobile && cy.hideNavGroupsMobile();
      isUsingTablet && cy.hideNavGroupsTablet();
      cy.findByRole('button', { name: 'Tilbake til oppsummering' }).clickAndGone();

      cy.findByRole('button', { name: 'Send inn' }).clickAndGone();
      cy.findByRole('heading', { name: 'Se over svarene dine før du sender inn' }).should('be.visible');
      cy.findByRole('button', { name: 'Send inn' }).clickAndGone();
      cy.findByRole('heading', { name: 'Skjemaet er sendt inn' }).should('be.visible');
    }),
  );

  it('navigation processing state should not stay pending if a useWaitForState unmounts before resolving', () => {
    cy.startAppInstance(appFrontend.apps.navigationTest);
    cy.waitForLoad();
    cy.gotoNavGroup(/Utfylling/, 'desktop', /Fødselsdag/);
    // Typing invalid data into the date-picker and immediately clicking next
    // causes us to first wait for saving, then when the validation fails
    // the error report causes the next-button to unmount before
    // saving finishes. This unmounts the waitForState hook so the promise
    // is never resolved and the callback is never completed.
    // Make sure this does not lead to everything staying disabled.
    cy.findByRole('textbox', { name: /Fødselsdag/ }).type('1234');
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.findByRole('button', { name: 'Neste' }).should('not.be.disabled');
  });
});
