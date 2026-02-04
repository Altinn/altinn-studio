import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

describe('Language', () => {
  it('should not crash if language is not specified', () => {
    interceptAltinnAppGlobalData((globalData) => {
      if (globalData.userProfile) {
        globalData.userProfile.profileSettingPreference.language = null;
      }
    });

    cy.goto('changename');

    cy.waitForLoad();
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });

  it('should not crash if language is stored as "null" in local storage', () => {
    interceptAltinnAppGlobalData((globalData) => {
      if (globalData.userProfile) {
        globalData.userProfile.profileSettingPreference.language = null;
      }
    });

    cy.goto('changename').then(() => {
      cy.clearCookie('test_10000_lang');
    });

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
});
