export const chaiExtensions = (_chai) => {
  /**
   * @see https://www.webtips.dev/webtips/cypress/check-if-element-is-in-viewport
   */
  function assertIsInViewport() {
    const subject = this._obj;

    const height = Cypress.$(cy.state('window')).height();
    const width = Cypress.$(cy.state('window')).width();
    const rect = subject[0].getBoundingClientRect();

    this.assert(
      // Changed from the linked source to make sure the element is entirely visible inside
      // the viewport (no part of the element is outside)
      height !== undefined &&
        width !== undefined &&
        rect.top > 0 &&
        rect.top < height &&
        rect.right <= width &&
        rect.left >= 0 &&
        rect.bottom <= height,
      'expected #{this} to be in the viewport',
      'expected #{this} to not be in the viewport',
      this._obj,
    );
  }

  _chai.Assertion.addMethod('inViewport', assertIsInViewport);
};
