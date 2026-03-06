Cypress.Commands.add('toMatchSnapshot', { prevSubject: true }, (subject: unknown) => {
  const key = Cypress.currentTest.titlePath.join(' -- ');

  cy.task<boolean>('snapshotExists', key).then((exists) => {
    if (exists) {
      cy.task<unknown>('readSnapshot', key).then((existing) => {
        expect(subject).to.deep.equal(existing, `Snapshot mismatch for "${key}"`);
      });
    } else {
      cy.task('writeSnapshot', { key, value: subject });
      cy.log(`New snapshot written for: "${key}"`);
    }
  });
});
