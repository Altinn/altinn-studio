import { Datalist } from 'test/e2e/pageobjects/datalist';

const dataListPage = new Datalist();

describe('List component', () => {
  it('Dynamic list is loaded and works correctly', () => {
    cy.goto('datalist');

    cy.log('List should be loaded correctly');
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

    cy.log('Should be possible to select a row');
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .should('not.have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .should('have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Kåre').parent('td').parent('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Kåre')
      .closest('tr')
      .get(dataListPage.tableBody)
      .contains('Caroline')
      .closest('tr')
      .should('not.have.class', dataListPage.selectedRowClass);

    cy.log('Should be possible to change the number of rows to show');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).should('have.value', '5');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 5);
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).should('have.value', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('5');

    cy.log('Sorting should work as expected');
    cy.get(dataListPage.sortButton).click();
    cy.get(dataListPage.sortButton).get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.sortButton).click();
    cy.get(dataListPage.sortButton).get(dataListPage.tableBody).first().first().contains('Petter');

    cy.log('Navigation in pagination should work as expected');
    cy.get(dataListPage.navigateNextButton).should('not.be.disabled');
    cy.get(dataListPage.tableBody).first().first().contains('Caroline');
    cy.get(dataListPage.navigateNextButton).click();
    cy.get(dataListPage.navigateNextButton).get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.navigatePreviousButton).click();
    cy.get(dataListPage.navigatePreviousButton).get(dataListPage.tableBody).first().first().contains('Caroline');

    cy.log('Expand to 10 rows and take a snapshot');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
    cy.get(dataListPage.tableBody).contains('Kåre').closest('tr').should('have.class', dataListPage.selectedRowClass);
    cy.snapshot('list-component');

    cy.log('Search should work as expected');
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
