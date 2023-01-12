Cypress.Commands.add(
  'isVisible',
  {
    prevSubject: true,
  },
  (subject) => {
    const isVisible = (elem) => !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
    expect(isVisible(subject[0])).to.be.true;
  },
);
