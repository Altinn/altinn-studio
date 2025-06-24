export const groupCheckboxMultiSelectListAndVerify = (checkboxText = '', multiSelectText = '', listText = '') => {
  cy.gotoNavPage('Avkryssningsbokser');
  const checkboxes = '[data-componentid=CheckboxesPage-Checkboxes2]';
  cy.get(checkboxes).contains('label', checkboxText).prev('input[type="checkbox"]').click();
  cy.get(checkboxes).contains('label', checkboxText).prev('input[type="checkbox"]').should('be.checked');

  cy.gotoNavPage('Flervalg');
  const multiselect = '#form-content-MultipleSelectPage-Checkboxes2';
  const repGroup = '[data-componentid=MultipleSelectPage-RepeatingGroup]';
  const multiselectList = 'u-datalist[role="listbox"]';
  cy.get(multiselect).click();
  cy.get(multiselectList).contains('span', multiSelectText).click();
  cy.get(multiselect).contains('span', multiSelectText).should('exist');
  cy.findByRole('button', { name: new RegExp(`${multiSelectText}, Press to remove, 1 of 1`) }).should('exist');
  cy.get(repGroup).click({ force: true });

  cy.gotoNavPage('Liste (tabell)');
  const list = '[data-componentid=ListPage-ListWithCheckboxesComponent]';
  cy.get(list).findByRole('cell', { name: listText }).parent().click();
  cy.get(list).findByRole('cell', { name: listText }).parent().findByRole('checkbox').should('be.checked');
};
