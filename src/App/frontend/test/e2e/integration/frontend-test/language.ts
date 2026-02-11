import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

function interceptLanguageFeatures({ lang }: { lang?: string | null }) {
  interceptAltinnAppGlobalData((globalData) => {
    if (lang !== undefined && globalData.userProfile) {
      globalData.userProfile.profileSettingPreference.language = lang;
    }
    globalData.ui.settings.showLanguageSelector = true;
  });
}

function setLanguageCookie(lang: string) {
  const encodedValue = encodeURIComponent(JSON.stringify(lang));
  const path = '/ttd/frontend-test';
  cy.setCookie('lang_512345', encodedValue, { path });
}

function visitWithLangParam(lang: string) {
  cy.url().then((url) => {
    const urlWithLang = url.includes('?') ? `${url}&lang=${lang}` : `${url}?lang=${lang}`;
    cy.visit(urlWithLang);
    cy.waitForLoad();
  });
}

describe('Language', () => {
  it('should not crash if language is not specified', () => {
    interceptLanguageFeatures({ lang: null });

    cy.goto('changename');
    cy.waitForLoad();

    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });

  it('should be possible to change language with arrow keys and space', () => {
    cy.goto('changename');
    cy.get(appFrontend.languageSelector).click();
    cy.press('Tab');
    cy.focused().should('contain.text', 'Norsk bokmål');
    cy.press('ArrowUp');
    cy.focused().should('contain.text', 'Engelsk');
    cy.press('Space');

    cy.waitForLoad();
  });

  describe('Language selection priority', () => {
    it('URL parameter takes priority over cookie and profile', () => {
      interceptLanguageFeatures({ lang: 'nb' });
      cy.goto('changename');
      cy.waitForLoad();
      setLanguageCookie('nb');

      visitWithLangParam('en');

      cy.get(appFrontend.header).should('contain.text', 'ENGLISH');
    });

    it('Cookie takes priority over profile', () => {
      interceptLanguageFeatures({ lang: 'nb' });
      cy.goto('changename');
      cy.waitForLoad();

      setLanguageCookie('en');
      cy.reloadAndWait();

      cy.get(appFrontend.header).should('contain.text', 'ENGLISH');
    });

    it('Profile language is used when no URL or cookie present', () => {
      interceptLanguageFeatures({ lang: 'en' });

      cy.goto('changename');
      cy.waitForLoad();

      cy.get(appFrontend.header).should('contain.text', 'ENGLISH');
    });

    it('Selecting language via selector clears URL parameter', () => {
      interceptLanguageFeatures({});
      cy.goto('changename');
      cy.waitForLoad();
      visitWithLangParam('en');
      cy.get(appFrontend.header).should('contain.text', 'ENGLISH');

      cy.findByRole('button', { name: 'Language' }).click();
      cy.findByRole('menuitemradio', { name: 'Norwegian bokmål' }).click();
      cy.waitForLoad();

      cy.url().should('not.include', 'lang=');
      cy.get(appFrontend.header).should('not.contain.text', 'ENGLISH');

      cy.reloadAndWait();
      cy.get(appFrontend.header).should('not.contain.text', 'ENGLISH');
    });

    it('Invalid URL parameter falls back to Norwegian', () => {
      cy.ignoreConsoleMessages([/User's preferred language from query parameter/]);
      interceptLanguageFeatures({});
      cy.goto('changename');
      cy.waitForLoad();

      visitWithLangParam('invalid');

      cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
      cy.get(appFrontend.header).should('not.contain.text', 'ENGLISH');
    });
  });
});
