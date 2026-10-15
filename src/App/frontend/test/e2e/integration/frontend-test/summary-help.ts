describe('Summary help text', () => {
  for (const type of ['Summary', 'Summary2'] as const) {
    it(`keeps the help marker square when a ${type} heading wraps`, () => {
      const title = 'En lang overskrift som skal brytes over flere linjer i oppsummeringen av skjemaet';
      const help = 'Her finner du mer informasjon om oppsummeringen.';
      cy.interceptLayout('Task_2', undefined, (layouts) => {
        layouts.form!.data.layout.push({
          id: 'heading-with-help',
          type: 'Heading',
          size: 'M',
          textResourceBindings: { title, help },
        });
        layouts.summary!.data.layout = [
          { id: 'nav-summary', type: 'NavigationBar' },
          type === 'Summary'
            ? { id: 'summary-heading', type, componentRef: 'heading-with-help' }
            : { id: 'summary-heading', type, target: { type: 'component', id: 'heading-with-help' } },
        ];
      });
      cy.goto('changename');
      cy.gotoNavPage('summary');
      cy.viewport(600, 700);
      cy.findByRole('heading', { name: title }).should(($heading) => {
        const lineHeight = parseFloat(getComputedStyle($heading[0]).lineHeight);
        expect($heading[0].getBoundingClientRect().height, 'the heading wraps').to.be.greaterThan(lineHeight * 1.5);
      });
      cy.findByRole('button', { name: `Hjelpetekst for ${title}` }).focus();
      cy.findByRole('button', { name: `Hjelpetekst for ${title}` }).should(($button) => {
        const bounds = $button[0].getBoundingClientRect();
        expect(bounds.width, 'the focused help marker remains square').to.be.closeTo(bounds.height, 1);
        expect(bounds.height, 'the marker keeps its intended size').to.be.lessThan(40);
      });
      cy.findByRole('button', { name: `Hjelpetekst for ${title}` }).click();
      cy.findByTestId('helptext').should('contain.text', help).and('be.visible');
    });
  }
});
