import { Datalist } from 'test/e2e/pageobjects/datalist';

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
    cy.findAllByRole('button', { name: /neste/i }).first().get(dataListPage.tableBody).first().first().contains('Hans');
    cy.findByRole('button', { name: /forrige/i }).click();
    cy.findByRole('button', { name: /forrige/i })
      .get(dataListPage.tableBody)
      .first()
      .first()
      .contains('Caroline');
  });

  it('Should expand to 10 rows and take a snapshot', () => {
    cy.goto('datalist');

    cy.get(dataListPage.listComponent).get(dataListPage.selectComponent).select('10');
    cy.get(dataListPage.listComponent).get(dataListPage.tableBody).find('tr').its('length').should('eq', 10);

    cy.snapshot('list-component');
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
