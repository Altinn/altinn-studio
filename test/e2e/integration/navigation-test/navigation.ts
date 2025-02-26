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
      cy.viewport(width, height);
      cy.startAppInstance(appFrontend.apps.navigationTest);
      cy.waitForLoad();

      // Check initial conditions
      cy.showNavGroups(true);
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, 'Generell info').should('have.attr', 'aria-current', 'page');
      cy.navGroup(/^Informasjon/, 'Litt mer info').should('not.have.attr', 'aria-current');

      cy.navGroup('Utfylling').should('have.attr', 'aria-expanded', 'false');
      cy.navGroup('Utfylling').should('not.have.attr', 'aria-current');

      cy.navGroup('Viktig informasjon').should('not.have.attr', 'aria-expanded');
      cy.navGroup('Viktig informasjon').should('not.have.attr', 'aria-current');

      cy.navGroup('Innsending').should('have.attr', 'aria-expanded', 'false');
      cy.navGroup('Innsending').should('not.have.attr', 'aria-current');

      cy.navGroup('Bekreftelse').should('be.disabled');
      cy.navGroup('Bekreftelse').should('not.have.attr', 'aria-current');

      cy.navGroup('Kvittering').should('be.disabled');
      cy.navGroup('Kvittering').should('not.have.attr', 'aria-current');
      cy.showNavGroups(false);

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      cy.showNavGroups(true);
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, 'Generell info').should('not.have.attr', 'aria-current');
      cy.navGroup(/^Informasjon/, 'Litt mer info').should('have.attr', 'aria-current', 'page');
      cy.showNavGroups(false);

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      cy.showNavGroups(true);
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'false');
      cy.navGroup(/^Informasjon/).should('not.have.attr', 'aria-current');

      cy.navGroup('Utfylling').should('have.attr', 'aria-expanded', 'true');
      cy.navGroup('Utfylling').should('have.attr', 'aria-current', 'step');
      cy.navGroup('Utfylling', 'Fornavn').should('have.attr', 'aria-current', 'page');
      cy.navGroup('Utfylling', 'Fornavn').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Etternavn').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Alder').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Alder').find(ICON_ERROR).should('not.exist');
      cy.showNavGroups(false);

      cy.findByRole('textbox', { name: /Fornavn/ }).type('Donald');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('textbox', { name: /Etternavn/ }).type('Duck');
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      cy.showNavGroups(true);
      cy.navGroup('Utfylling').should('have.attr', 'aria-expanded', 'true');
      cy.navGroup('Utfylling').should('have.attr', 'aria-current', 'step');
      cy.navGroup('Utfylling', 'Fornavn').find(ICON_COMPLETE).should('be.visible');
      cy.navGroup('Utfylling', 'Etternavn').find(ICON_COMPLETE).should('be.visible');
      cy.navGroup('Utfylling', 'Alder').should('have.attr', 'aria-current', 'page');
      cy.showNavGroups(false);

      cy.findByRole('textbox', { name: /Alder/ }).type('123');
      cy.get(appFrontend.errorReport).should('be.visible');

      cy.showNavGroups(true);
      cy.navGroup('Utfylling', 'Alder').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Alder').find(ICON_ERROR).should('not.exist');
      cy.showNavGroups(false);

      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      cy.showNavGroups(true);
      cy.navGroup('Utfylling', 'Fødselsdag').should('have.attr', 'aria-current', 'page');
      cy.navGroup('Utfylling', 'Alder').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Alder').find(ICON_ERROR).should('be.visible');
      cy.readFile('test/percy.css').then((percyCSS) => {
        cy.testWcag();
        cy.percySnapshot(`navigation:page-states (${device})`, { percyCSS, widths: [width] });
      });
      cy.gotoNavGroup(/^Informasjon/, 'Generell info');

      cy.showNavGroups(true);
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-expanded', 'true');
      cy.navGroup(/^Informasjon/).should('have.attr', 'aria-current', 'step');
      cy.navGroup(/^Informasjon/, 'Generell info').should('have.attr', 'aria-current', 'page');
      cy.navGroup('Utfylling').should('have.attr', 'aria-expanded', 'false');
      cy.navGroup('Utfylling').should('not.have.attr', 'aria-current');
      cy.navGroup('Utfylling').find(ICON_ERROR).should('be.visible');
      cy.gotoNavGroup('Utfylling', 'Alder');

      cy.findByRole('textbox', { name: /Alder/ }).clear();
      cy.findByRole('textbox', { name: /Alder/ }).type('42');
      cy.get(appFrontend.errorReport).should('not.exist');

      cy.showNavGroups(true);
      cy.navGroup('Utfylling', 'Biler').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Biler').find(ICON_ERROR).should('not.exist');
      cy.gotoNavGroup('Utfylling', 'Biler');

      cy.showNavGroups(true);
      cy.navGroup('Utfylling', 'Alder').find(ICON_COMPLETE).should('be.visible');
      cy.navGroup('Utfylling', 'Alder').find(ICON_ERROR).should('not.exist');
      cy.gotoNavGroup('Utfylling', 'Fødselsdag');

      cy.showNavGroups(true);
      cy.navGroup('Utfylling', 'Biler').find(ICON_COMPLETE).should('not.exist');
      cy.navGroup('Utfylling', 'Biler').find(ICON_ERROR).should('not.exist');
      cy.showNavGroups(false);

      cy.findByRole('textbox', { name: /Fødselsdag/ }).type('01011983');
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

      cy.showNavGroups(true);
      cy.navGroup('Registreringsnummer').should('have.attr', 'aria-current', 'page');
      cy.navGroup('Registreringsnummer').should('not.have.attr', 'aria-expanded');
      cy.navGroup('Informasjon').should('have.attr', 'aria-expanded', 'false');
      cy.navGroup('Informasjon').should('not.have.attr', 'aria-current');
      cy.openNavGroup('Informasjon');
      cy.navGroup('Informasjon', 'Merke').should('not.have.attr', 'aria-current');
      cy.navGroup('Informasjon', 'Årsmodell').should('not.have.attr', 'aria-current');
      cy.navGroup('Bekreftelse').should('not.exist');
      cy.navGroup('Kvittering').should('not.exist');
      cy.showNavGroups(false);

      cy.findByRole('button', { name: /Biler$/ }).clickAndGone();
      cy.waitForLoad();
      cy.findByRole('button', { name: 'Legg til bil' }).should('be.visible');
      cy.findByRole('button', { name: 'Slett' }).clickAndGone();
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();
      cy.findByRole('button', { name: 'Neste' }).clickAndGone();

      cy.showNavGroups(true);
      cy.navGroup('Utfylling').should('have.attr', 'aria-expanded', 'false');
      cy.navGroup('Utfylling').should('not.have.attr', 'aria-current');
      cy.navGroup('Utfylling').find(ICON_COMPLETE).should('be.visible');
      cy.openNavGroup('Innsending');
      cy.navGroup('Innsending', 'Tilbakemelding').should('be.visible');
      cy.navGroup('Innsending', 'Oppsummering').should('be.visible');
      cy.gotoNavGroup('Utfylling', 'Ekstra');

      cy.findByRole('checkbox', { name: 'Skjul tilbakemelding' }).dsCheck();

      cy.showNavGroups(true);
      cy.openNavGroup('Innsending');
      cy.navGroup('Innsending', 'Tilbakemelding').should('not.exist');
      cy.navGroup('Innsending', 'Oppsummering').should('be.visible');
      cy.showNavGroups(false);
      cy.findByRole('checkbox', { name: 'Skjul oppsummering' }).dsCheck();
      cy.showNavGroups(true);
      cy.navGroup('Innsending').should('not.exist');
      cy.showNavGroups(false);

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

      cy.showNavGroups(true);
      cy.navGroup('Personopplysninger').should('be.disabled');
      cy.navGroup('Personopplysninger').should('not.have.attr', 'aria-current');
      cy.navGroup('Bekreftelse').should('be.disabled');
      cy.navGroup('Bekreftelse').should('have.attr', 'aria-current', 'step');
      cy.navGroup('Kvittering').should('be.disabled');
      cy.navGroup('Kvittering').should('not.have.attr', 'aria-current');
      cy.showNavGroups(false);

      cy.findByRole('button', { name: 'Send inn' }).clickAndGone();

      cy.findByRole('heading', { name: 'Skjemaet er sendt inn' }).should('be.visible');
      cy.get(NAVIGATION_COMPONENT).should('not.exist');
      cy.get(NAVIGATION_TRIGGER).should('not.exist');
    }),
  );
});
