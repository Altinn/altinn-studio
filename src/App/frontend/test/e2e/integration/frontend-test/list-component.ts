import { Datalist } from 'test/e2e/pageobjects/datalist';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const dataListPage = new Datalist();

describe('List component', () => {
  it('List should by loaded correctly', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).first().should('be.visible');
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .within(() => {
        cy.get('td').eq(2).contains(28);
        cy.get('td').eq(3).contains('Utvikler');
      });
    cy.get(dataListPage.tableBody)
      .contains('Kåre')
      .closest('tr')
      .within(() => {
        cy.get('td').eq(2).contains(37);
        cy.get('td').eq(3).contains('Sykepleier');
      });
    cy.get(dataListPage.tableBody)
      .contains('Petter')
      .closest('tr')
      .within(() => {
        cy.get('td').eq(2).contains(19);
        cy.get('td').eq(3).contains('Personlig trener');
      });
  });

  it('Should be possible to select a row', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .within(() => {
        cy.get(dataListPage.radioButton).should('not.be.checked');
      });
    cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .within(() => {
        cy.get(dataListPage.radioButton).should('be.checked');
      });
    cy.get(dataListPage.tableBody).contains('Kåre').closest('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Kåre')
      .closest('tr')
      .get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .within(() => {
        cy.get(dataListPage.radioButton).should('not.be.checked');
      });
  });

  it('Should be possible to change the number of rows to show', () => {
    cy.goto('datalist');

    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).should('have.value', '5');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 5);
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).should('have.value', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('5');
  });

  it('Sorting should work as expected', () => {
    cy.goto('datalist');

    cy.findByRole('button', { name: /alder/i }).click();
    cy.findByRole('button', { name: /alder/i }).get(dataListPage.tableBody).first().first().contains('Hans');
    cy.findByRole('button', { name: /alder/i }).click();
    cy.findByRole('button', { name: /alder/i }).get(dataListPage.tableBody).first().first().contains('Petter');
  });

  it('Navigation in pagination should work as expected', () => {
    cy.goto('datalist');

    cy.findAllByRole('button', { name: /neste/i }).first().should('not.be.disabled');
    cy.get(dataListPage.tableBody).first().first().contains('Caroline');
    cy.findAllByRole('button', { name: /neste/i }).first().click();
    cy.get(dataListPage.tableBody).first().first().contains('Hans');
    cy.findByRole('button', { name: /forrige/i }).click();
    cy.get(dataListPage.tableBody).first().first().contains('Caroline');
  });

  it('Should expand to 10 rows and take a snapshot', () => {
    cy.goto('datalist');

    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
    cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).contains('Kåre').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).contains('Kåre').closest('tr').find('input').should('be.checked');

    // Covers radio, paginated, checkbox and read-only lists, each on desktop, tablet and mobile
    cy.visualTesting('list-component');
  });

  it('Should take a snapshot of Summary2 for every list', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).contains('Kåre').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).contains('Kari').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).find('input:checked').should('have.length', 2);

    // The other tasks are skipped by cy.goto(), so their summaries can't render
    cy.changeLayout((component) => {
      if (component.type === 'Summary2' && component.id !== 'summary2-task5') {
        component.hidden = true;
      }
    });
    cy.findAllByRole('button', { name: 'Neste' }).last().click();
    cy.findByRole('heading', { name: 'Oppsummering' }).should('be.visible');
    cy.findAllByRole('button', { name: 'Neste' }).last().click();
    cy.findByRole('table', { name: /Hvem skal få kopi av saken/ })
      .find<HTMLTableRowElement>('tbody tr')
      .should('have.length', 2)
      .and(($rows) => {
        expect([...$rows].map((row) => row.cells[0].textContent)).to.have.members(['Kåre', 'Kari']);
      });
    cy.findByRole('table', { name: /Personer i registeret/ }).should('contain.text', 'Mette');

    cy.visualTesting('list-component-summary2');
  });

  it('Should stack the columns of every list on mobile', () => {
    cy.viewport('samsung-s10');
    cy.goto('datalist');
    cy.get('html.viewport-is-mobile').should('be.visible');

    // Single selection: one stacked value cell next to the radio. Mobile sorting is a separate follow-up.
    cy.get(dataListPage.listComponent).find('th').should('not.exist');
    cy.get(dataListPage.tableBody)
      .find('tr')
      .first()
      .find('td')
      .first()
      .find('input[type=radio]')
      .should('have.attr', 'required');
    cy.get(dataListPage.tableBody).find('tr').first().find('td').should('have.length', 2);
    cy.get(dataListPage.tableBody)
      .find('tr')
      .first()
      .find('td')
      .last()
      .should('contain.text', 'Navn: Caroline')
      .and('contain.text', 'Alder: 28');
    cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
    cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').find('input').should('be.checked');

    cy.get(dataListPage.listComponent).findByRole('combobox').should('not.exist');
    cy.get(dataListPage.listComponent).findByRole('button', { name: /alder/i }).should('not.exist');

    // Pagination still works
    cy.get(dataListPage.listComponent).findByRole('button', { name: 'Side 2' }).click();
    cy.get(dataListPage.tableBody).find('tr').first().should('contain.text', 'Navn: Hans');

    // Multiple selection uses the same value/control cell split
    cy.get(dataListPage.checkboxesTableBody).find('tr').first().find('td').should('have.length', 2);
    cy.get(dataListPage.checkboxesTableBody)
      .find('tr')
      .first()
      .find('td')
      .first()
      .find('input[type=checkbox]')
      .should('exist');
    cy.get(dataListPage.checkboxesTableBody)
      .find('tr')
      .first()
      .find('td')
      .last()
      .should('contain.text', 'Navn: Caroline')
      .and('contain.text', 'Alder: 28');
    cy.get(dataListPage.checkboxesTableBody).contains('Kåre').closest('tr').click();
    cy.get(dataListPage.checkboxesTableBody).contains('Kari').closest('tr').find('input').check();
    cy.get(dataListPage.checkboxesTableBody).find('input:checked').should('have.length', 2);

    // Read-only, with tableHeadersMobile showing only some of the columns
    cy.get('#form-content-listReadOnly').find('th').should('not.exist');
    cy.get(dataListPage.readOnlyTableBody).find('input').should('not.exist');
    cy.get(dataListPage.readOnlyTableBody)
      .find('tr')
      .first()
      .find('td')
      .should('have.length', 1)
      .and('contain.text', 'Navn: Caroline');
    cy.get(dataListPage.readOnlyTableBody).find('tr').first().should('contain.text', 'Yrke: Utvikler');
    cy.get(dataListPage.readOnlyTableBody).find('tr').first().should('not.contain.text', 'Alder');

    // Nothing should be wider than the screen
    cy.document().should((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('keeps descriptions and mobile selection labels while preserving all columns in PDF', { retries: 0 }, () => {
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_5.pages.pdfLayoutName = 'summary2';
    });
    cy.interceptLayout(
      'Task_5',
      (component) => {
        if (component.type === 'List' && component.id === 'listComponent') {
          component.tableHeadersMobile = ['name'];
          component.textResourceBindings = { description: 'Velg personen saken gjelder' };
        }
        if (component.type === 'List' && component.id === 'listCheckboxes') {
          component.tableHeadersMobile = ['name'];
          component.required = true;
        }
        if (component.type === 'List' && component.id === 'listReadOnly') {
          component.sortableColumns = ['age'];
        }
      },
      (layouts) => {
        layouts.summary2!.data.layout = [
          { id: 'summary-readonly', type: 'Summary2', target: { type: 'component', id: 'listReadOnly' } },
          { id: 'summary-checkboxes', type: 'Summary2', target: { type: 'component', id: 'listCheckboxes' } },
        ];
      },
      {},
    );
    cy.viewport('samsung-s10');
    cy.goto('datalist');
    cy.get(dataListPage.listComponent).should('contain.text', 'Velg personen saken gjelder');
    cy.get(dataListPage.listComponent).findByRole('radio', { name: 'Navn: Caroline' }).check();
    cy.get(dataListPage.checkboxesTableBody).findByRole('checkbox', { name: 'Navn: Kåre' }).check();
    cy.get(dataListPage.tableBody)
      .find('tr')
      .first()
      .find('td')
      .last()
      .should('contain.text', 'Navn: Caroline')
      .and('not.contain.text', 'Alder');

    cy.testPdf({
      callback: () => {
        cy.window().its('innerWidth').should('eq', 794);
        const readonly = () => cy.findByRole('table', { name: /^Personer i registeret/ });
        const selectable = () => cy.findByRole('table', { name: 'Hvem skal få kopi av saken?' });
        readonly().findByRole('columnheader', { name: 'Alder' }).should('be.visible');
        readonly().find('tbody tr').first().find('td').should('have.length', 3).eq(1).should('have.text', '28');
        selectable().findByRole('columnheader', { name: 'Alder' }).should('be.visible');
        selectable()
          .find('tbody tr')
          .should('have.length', 1)
          .find('td')
          .should('have.length', 3)
          .eq(1)
          .should('have.text', '37');
      },
    });
  });

  it('Search should work as expected', () => {
    cy.goto('datalist');

    cy.get(dataListPage.searchInput).type('Johanne');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 1);
    cy.get(dataListPage.tableBody)
      .contains('Johanne')
      .closest('tr')
      .within(() => {
        cy.get('td').eq(2).contains(27);
        cy.get('td').eq(3).contains('Utvikler');
      });
    cy.get(dataListPage.tableBody).should('not.include.text', 'Kåre');
  });
});
