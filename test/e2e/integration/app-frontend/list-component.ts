import { Datalist } from 'test/e2e/pageobjects/datalist';

const dataListPage = new Datalist();

describe('List component', () => {
  it('Dynamic list is loaded correctly', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).first().should('be.visible');
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .parent('td')
      .parent('tr')
      .within(() => {
        cy.get('td').eq(2).contains(28);
        cy.get('td').eq(3).contains('Utvikler');
      });
    cy.get(dataListPage.tableBody)
      .contains('Kåre')
      .parent('td')
      .parent('tr')
      .within(() => {
        cy.get('td').eq(2).contains(37);
        cy.get('td').eq(3).contains('Sykepleier');
      });
    cy.get(dataListPage.tableBody)
      .contains('Petter')
      .parent('td')
      .parent('tr')
      .within(() => {
        cy.get('td').eq(2).contains(19);
        cy.get('td').eq(3).contains('Personlig trener');
      });
  });

  it('It is possible to select a row', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).first().should('be.visible');
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .parent('td')
      .parent('tr')
      .should('not.have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Caroline')
      .parent('td')
      .parent('tr')
      .should('have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Kåre').parent('td').parent('tr').click();
    cy.get(dataListPage.tableBody)
      .contains('Kåre')
      .parent('td')
      .parent('tr')
      .get(dataListPage.tableBody)
      .contains('Caroline')
      .parent('td')
      .parent('tr')
      .should('not.have.class', dataListPage.selectedRowClass);
  });

  it('When selecting number of rows to show this is updated correctly', () => {
    cy.goto('datalist');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).should('have.value', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
  });

  it('When navigation between pages the expected data is shown in the first table row', () => {
    cy.goto('datalist');
    cy.get(dataListPage.navigateNextButton).should('not.be.disabled');
    cy.get(dataListPage.tableBody).first().first().contains('Caroline');
    cy.get(dataListPage.navigateNextButton).click();
    cy.get(dataListPage.navigateNextButton).get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.navigatePreviousButton).click();
    cy.get(dataListPage.navigatePreviousButton).get(dataListPage.tableBody).first().first().contains('Caroline');
  });

  it('Sorting works as expected', () => {
    cy.goto('datalist');
    cy.get(dataListPage.sortButton).click();
    cy.get(dataListPage.sortButton).get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.sortButton).click();
    cy.get(dataListPage.sortButton).get(dataListPage.tableBody).first().first().contains('Petter');
  });
  it('Search works with list as intended', () => {
    cy.goto('datalist');
    cy.get(dataListPage.searchInput).type('Johanne');
    cy.get(dataListPage.tableBody)
      .contains('Johanne')
      .parent('td')
      .parent('tr')
      .within(() => {
        cy.get('td').eq(2).contains(27);
        cy.get('td').eq(3).contains('Utvikler');
      });
    cy.get(dataListPage.tableBody).should('not.include.text', 'Kåre');
  });
});
