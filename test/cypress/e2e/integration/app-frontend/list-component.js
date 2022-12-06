import { Datalist } from '../../pageobjects/datalist';

const dataListPage = new Datalist();

describe('List component', () => {
  it('Dynamic list is loaded correctly', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).first().should('be.visible');
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').within(() => {
      cy.get('td').eq(2).contains(28);
      cy.get('td').eq(3).contains('Utvikler');
    });
    cy.get(dataListPage.tableBody).contains('Kåre').parent('td').parent('tr').within(() => {
      cy.get('td').eq(2).contains(37);
      cy.get('td').eq(3).contains('Sykepleier');
    });
    cy.get(dataListPage.tableBody).contains('Petter').parent('td').parent('tr').within(() => {
      cy.get('td').eq(2).contains(19);
      cy.get('td').eq(3).contains('Personlig trener');
    });
  });

  it('It is possible to select a row', () => {
    cy.goto('datalist');
    cy.get(dataListPage.tableBody).first().should('be.visible');
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').should('not.have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').click().should('have.class', dataListPage.selectedRowClass);
    cy.get(dataListPage.tableBody).contains('Kåre').parent('td').parent('tr').click().get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').should('not.have.class', dataListPage.selectedRowClass);
  });

  it('When selecting number of rows to show this is updated correctly', () => {
    cy.goto('datalist');
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10').should('have.value', 10);
    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10').get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);
  });

  it('When navigation between pages the expected data is shown in the first table row', () => {
    cy.goto('datalist');
    cy.get(dataListPage.navigateNextButton).should('not.be.disabled');
    cy.get(dataListPage.tableBody).first().first().contains('Caroline');
    cy.get(dataListPage.navigateNextButton).click().get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.navigatePreviousButton).click().get(dataListPage.tableBody).first().first().contains('Caroline');
  });

  it('Sorting works as expected', () => {
    cy.goto('datalist');
    cy.get(dataListPage.sortButton).click().get(dataListPage.tableBody).first().first().contains('Hans');
    cy.get(dataListPage.sortButton).click().get(dataListPage.tableBody).first().first().contains('Petter');
  });

});
