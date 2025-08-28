Cypress.Commands.add('isVisible', { prevSubject: true }, (subject) => {
  const isVisible = (elem) =>
    !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  expect(isVisible(subject[0])).to.be.true;
});

/**
 * Visit a location in Studio with given feature flag toggled on.
 * @param path The base path to visit
 * @param featureFlag The feature flag to toggle on
 * @param persistFeatureFlag Specifies if the feature flag should be persisted on navigation. Defaults to true.
 */
Cypress.Commands.add('visitWithFeatureFlag', (path, featureFlag, persistFeatureFlag = true) => {
  cy.visit(`${path}?featureFlags=${featureFlag}&persistFeatureFlag=${persistFeatureFlag}`);
});
