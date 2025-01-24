import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

interface PetProps {
  species: string;
  name: string;
  age: number;
  visible?: boolean;
}

function addPet({ species, name, age }: PetProps) {
  cy.get(appFrontend.pets.group().editContainer._).should('not.exist');
  cy.get(appFrontend.pets.group().addButton).click();
  cy.dsSelect(appFrontend.pets.group().editContainer.species, species);
  cy.get(appFrontend.pets.group().editContainer.name).type(name);
  cy.get(appFrontend.pets.group().editContainer.age).type(age.toString());
  cy.get(appFrontend.pets.group().editContainer.saveAndClose).clickAndGone();
}

function assertPetOrder(pets: PetProps[], callNum: number, editingIndex?: number) {
  cy.log('--------------------');
  cy.log('Verifying that pet order is', structuredClone(pets));
  cy.log(`Call number: ${callNum}`);
  editingIndex !== undefined && cy.log(`Editing index: ${editingIndex}`);
  cy.waitUntilSaved();
  cy.waitUntilNodesReady();

  const visibleLength = pets.filter((pet) => pet.visible === true || pet.visible === undefined).length;
  cy.get(appFrontend.pets.group().tableRows).should(
    'have.length',
    editingIndex === undefined ? visibleLength : visibleLength + 1,
  );
  cy.get(appFrontend.pets.hide.all).should('have.length', pets.length);
  pets.forEach((pet, index) => {
    cy.get(appFrontend.pets.hide.all)
      .eq(index)
      .should(pet.visible === false ? 'be.checked' : 'not.be.checked');
    cy.get(appFrontend.pets.hide.all)
      .eq(index)
      .next()
      .should('have.text', `${pet.species} med navn ${pet.name} (${pet.age} år)`);
    if (pet.visible === false) {
      return;
    }
    const { species, name } = pet;
    cy.get(appFrontend.pets.group().tableRow(index).species).should('have.value', species);
    if (index === editingIndex) {
      cy.get(appFrontend.pets.group().editContainer.name).should('have.value', name);
    } else {
      cy.get(appFrontend.pets.group().tableRow(index).name).should('have.text', name);
    }
  });
}

const manuallyAddedPets: PetProps[] = [
  { species: 'Hund', name: 'Fido', age: 5 },
  { species: 'Katt', name: 'Whiskers', age: 3 },
  { species: 'Fisk', name: 'Goldie', age: 1 },
  { species: 'Fugl', name: 'Polly', age: 2 },
];

const petsFromCustomButton: PetProps[] = [
  { species: 'Hund', name: 'Preben Potet', age: 15 },
  { species: 'Katt', name: 'Reidar Reddik', age: 1 },
  { species: 'Fisk', name: 'Siri Spinat', age: 3 },
  { species: 'Hamster', name: 'Kåre Kålrot', age: 7 },
  { species: 'Kanin', name: 'Birte Blomkål', age: 2 },
  { species: 'Kanin', name: 'Birte Blomkål', age: 3 },
];

describe('Group (Pets)', () => {
  it('should be possible to add new pets manually', () => {
    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');

    // This page should automatically expand to the full width of the viewport
    cy.get('[data-testid="presentation"]').should('have.attr', 'data-expanded', 'true');

    cy.get(appFrontend.pets.decisionPanel.manualButton).click();
    manuallyAddedPets.forEach(addPet);
    assertPetOrder(manuallyAddedPets, 1);
  });

  it('should snapshot the decision panel', () => {
    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');
    cy.snapshot('pets-decision-panel');
  });

  it('should be possible to add predefined pets, sort them, validate them, hide them and delete them', () => {
    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');
    cy.get(appFrontend.pets.decisionPanel.autoPetsButton).click();
    const pets1 = [...petsFromCustomButton];
    assertPetOrder(pets1, 1);

    // Sort the rows from the outside
    cy.dsSelect(appFrontend.pets.sortOutside.sortOrder, 'Navn (A-Å)');
    cy.get(appFrontend.pets.sortOutside.sortButton).click();
    const pets2 = structuredClone(pets1).sort((a, b) => a.name.localeCompare(b.name));
    assertPetOrder(pets2, 2);

    cy.dsSelect(appFrontend.pets.sortOutside.sortOrder, 'Alder (1-9)');
    cy.get(appFrontend.pets.sortOutside.sortButton).click();
    const pets3 = structuredClone(pets2).sort((a, b) => a.age - b.age);
    assertPetOrder(pets3, 3);

    // Sort when having opened one row for editing
    cy.get(appFrontend.pets.group().tableRow(3).editButton).click();
    assertPetOrder(pets3, 4, 3);
    cy.get(appFrontend.pets.group().editContainer.species).should('have.value', 'Fisk');
    cy.get(appFrontend.pets.group().editContainer.name).should('have.value', 'Siri Spinat');
    cy.get(appFrontend.pets.group().editContainer.sortOrder).should('have.value', 'Alder (9-1)');
    cy.dsSelect(appFrontend.pets.group().editContainer.sortOrder, 'Art (Å-A)');
    cy.get(appFrontend.pets.group().editContainer.sortButton).click();

    const pets4 = structuredClone(pets3)
      .sort((a, b) => {
        const result = a.species.localeCompare(b.species);
        return result === 0 ? b.age - a.age : result;
      })
      .reverse();

    assertPetOrder(pets4, 5, 5);

    // We should still be editing the same row
    cy.get(appFrontend.pets.group().editContainer.species).should('have.value', 'Fisk');
    cy.get(appFrontend.pets.group().editContainer.name).should('have.value', 'Siri Spinat');
    cy.get(appFrontend.pets.group().editContainer.saveAndClose).clickAndGone();

    // Hiding one row via checkboxes
    cy.get(appFrontend.pets.hide._).findByRole('checkbox', { name: 'Fisk med navn Siri Spinat (3 år)' }).check();
    const pets5 = structuredClone(pets4);
    pets5[pets5.findIndex((pet) => pet.name === 'Siri Spinat')].visible = false;
    assertPetOrder(pets5, 6);

    // Hiding another row via checkboxes
    cy.get(appFrontend.pets.hide._).findByRole('checkbox', { name: 'Hund med navn Preben Potet (15 år)' }).check();
    const pets6 = structuredClone(pets5);
    pets6[pets6.findIndex((pet) => pet.name === 'Preben Potet')].visible = false;
    assertPetOrder(pets6, 7);

    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).should('contain.text', 'Du kan ikke ha flere dyr med samme navn og art.');

    cy.snapshot('pets');

    cy.get(appFrontend.pets.group().tableRow(1).deleteButton).click();
    const pets7 = structuredClone(pets6);
    const deletedIndex = pets7.findIndex((pet) => pet.name === 'Birte Blomkål' && pet.age === 2);
    pets7.splice(deletedIndex, 1);
    assertPetOrder(pets7, 8);

    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.errorReport).should('not.exist');
  });

  it('should handle switching to using the Option-component in a table', () => {
    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');
    cy.get(appFrontend.pets.decisionPanel.autoPetsButton).click();
    cy.get(appFrontend.pets.useOptions).findByRole('radio', { name: /Ja/i }).check();
    cy.get(appFrontend.pets.group(true).tableRow(0).species).should('not.exist');
    cy.get(appFrontend.pets.group(true).tableRow(0).speciesOption).should('contain.text', 'Hund'); // Label
    cy.get(appFrontend.pets.group(true).tableRow(0).speciesOption).should(
      'contain.text',
      'Hunder er menneskets beste venn, sier mange. Andre liker katter bedre.', // Help text
    );
    cy.get(appFrontend.pets.group(true).tableRow(0).speciesOption).should(
      'contain.text',
      'Pelskledd og lojal mot mennesker', // Description
    );
    cy.get(appFrontend.pets.group(true).tableRow(0).editButton).click();
    cy.dsSelect(appFrontend.pets.group().editContainer.species, 'Katt');
    cy.get(appFrontend.pets.group(true).tableRow(0).speciesOption).should('contain.text', 'Katt');
    cy.testWcag();
    cy.gotoNavPage('option-comp');
    cy.get('#header-collection1').should('be.visible');
    cy.testWcag();
  });

  it('innerGrid should be ignored when editing in table', () => {
    cy.interceptLayout('group', (comp) => {
      if (comp.id === 'pets' && comp.type === 'RepeatingGroup') {
        comp.tableColumns = {
          ...comp.tableColumns,
          'pet-name': {
            editInTable: true,
            showInExpandedEdit: true,
          },
        };
      }
      if (comp.id === 'pet-species' && comp.type === 'Dropdown') {
        comp.grid = {
          ...comp.grid,
          innerGrid: {
            xs: 1,
          },
        };
      }
      if (comp.id === 'pet-name' && comp.type === 'Input') {
        comp.grid = {
          ...comp.grid,
          innerGrid: {
            xs: 1,
          },
        };
      }
    });

    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');

    cy.get(appFrontend.pets.decisionPanel.autoPetsButton).click();

    cy.findAllByRole('combobox', { name: /art/i }).first().invoke('outerWidth').should('be.gt', 150);
    cy.findAllByRole('textbox', { name: /navn/i }).first().invoke('outerWidth').should('be.gt', 200);

    cy.snapshot('pets:edit-in-table');
  });
});
