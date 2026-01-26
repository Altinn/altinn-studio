import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

/**
 * Helper to base64 encode a URL (as expected by the backend returnUrl validator)
 */
function encodeReturnUrl(url: string): string {
  return btoa(url);
}

describe('Return URL', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('should show back button linking to decoded URL when returnUrl is valid', () => {
    const targetUrl = 'https://local.altinn.cloud/some-return-path';
    const encodedUrl = encodeReturnUrl(targetUrl);

    cy.startAppInstance(appFrontend.apps.frontendTest, {
      urlSuffix: `?returnUrl=${encodedUrl}`,
    });

    cy.findByRole('link', { name: /tilbake/i }).should('have.attr', 'href', targetUrl);
  });

  it('should fall back to messageBoxUrl when returnUrl has invalid base64 encoding', () => {
    const invalidBase64 = 'not-valid-base64!!!';

    cy.startAppInstance(appFrontend.apps.frontendTest, {
      urlSuffix: `?returnUrl=${invalidBase64}`,
    });

    // Should fall back to inbox link (messageBoxUrl)
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('exist');
  });

  it('should fall back to messageBoxUrl when returnUrl has invalid domain', () => {
    const invalidDomainUrl = 'https://malicious-site.com/steal-data';
    const encodedUrl = encodeReturnUrl(invalidDomainUrl);

    cy.startAppInstance(appFrontend.apps.frontendTest, {
      urlSuffix: `?returnUrl=${encodedUrl}`,
    });

    // Should fall back to inbox link (messageBoxUrl)
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('exist');
  });

  it('should show messageBoxUrl back button when no returnUrl is provided', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);

    // Should show inbox link (messageBoxUrl)
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('exist');
  });

  it('should fall back to messageBoxUrl when returnUrl is empty', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      urlSuffix: '?returnUrl=',
    });

    // Should fall back to inbox link (messageBoxUrl)
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('exist');
  });

  it('should persist returnUrl through form page navigation', () => {
    const targetUrl = 'https://local.altinn.cloud/persistent-return';
    const encodedUrl = encodeReturnUrl(targetUrl);

    cy.startAppInstance(appFrontend.apps.frontendTest, {
      urlSuffix: `?returnUrl=${encodedUrl}`,
    });

    // Verify back button exists with correct URL on first page
    cy.findByRole('link', { name: /tilbake/i }).should('have.attr', 'href', targetUrl);

    // Navigate to next task (click submit on message page)
    cy.findByRole('button', { name: /send inn/i }).click();

    // Verify back button still has correct URL after navigation
    cy.findByRole('link', { name: /tilbake/i }).should('have.attr', 'href', targetUrl);
  });
});
