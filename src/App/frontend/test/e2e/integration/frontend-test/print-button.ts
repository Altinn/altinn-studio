describe('Print button', () => {
  it('check that print button is present, and window.print is called', () => {
    cy.goto('changename');

    cy.window().then((win) => {
      const printStub = cy.stub(win, 'print');
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.contains('button', 'Print / Lagre PDF')
        .click()
        .then(() => {
          expect(printStub).to.be.called;
        });
    });
  });
});
