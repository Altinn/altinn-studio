import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const Species = {
  Dog: { nb: 'Hund', en: 'Dog' },
  Cat: { nb: 'Katt', en: 'Cat' },
  Fish: { nb: 'Fisk', en: 'Fish' },
  Bird: { nb: 'Fugl', en: 'Bird' },
  Hamster: { nb: 'Hamster', en: 'Hamster' },
  Rabbit: { nb: 'Kanin', en: 'Rabbit' },
};

interface PetProps {
  species: keyof typeof Species;
  name: string;
  age: number;
  visible?: boolean;
}

function addPet({ species, name, age }: PetProps) {
  cy.get(appFrontend.pets.group.editContainer._).should('not.exist');
  cy.get(appFrontend.pets.group.addButton).click();
  cy.dsSelect(appFrontend.pets.group.editContainer.species, Species[species].nb);
  cy.get(appFrontend.pets.group.editContainer.name).type(name);
  cy.get(appFrontend.pets.group.editContainer.age).type(age.toString());
  cy.get(appFrontend.pets.group.editContainer.saveAndClose).clickAndGone();
}

function assertPetOrder(pets: PetProps[], editingIndex?: number) {
  const visibleLength = pets.filter((pet) => pet.visible === true || pet.visible === undefined).length;
  cy.get(appFrontend.pets.group.tableRows).should(
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
      .should('have.text', `${Species[pet.species].en} med navn ${pet.name} (${pet.age} år)`);
    if (pet.visible === false) {
      return;
    }
    const { species, name } = pet;
    cy.get(appFrontend.pets.group.tableRow(index).species).should('have.value', Species[species].nb);
    if (index === editingIndex) {
      cy.get(appFrontend.pets.group.editContainer.name).should('have.value', name);
    } else {
      cy.get(appFrontend.pets.group.tableRow(index).name).should('have.text', name);
    }
  });
}

const manuallyAddedPets: PetProps[] = [
  { species: 'Dog', name: 'Fido', age: 5 },
  { species: 'Cat', name: 'Whiskers', age: 3 },
  { species: 'Fish', name: 'Goldie', age: 1 },
  { species: 'Bird', name: 'Polly', age: 2 },
];

const petsFromCustomButton: PetProps[] = [
  { species: 'Dog', name: 'Preben Potet', age: 15 },
  { species: 'Cat', name: 'Reidar Reddik', age: 1 },
  { species: 'Fish', name: 'Siri Spinat', age: 3 },
  { species: 'Hamster', name: 'Kåre Kålrot', age: 7 },
  { species: 'Rabbit', name: 'Birte Blomkål', age: 2 },
  { species: 'Rabbit', name: 'Birte Blomkål', age: 3 },
];

describe('Group (Pets)', () => {
  // TODO: Fix this test. It fails because the Dropdown component somehow doesn't work when selecting the correct
  // species option the second time.
  it.skip('should be possible to add new pets manually', () => {
    cy.goto('group');
    cy.gotoNavPage('Kjæledyr');

    // This page should automatically expand to the full width of the viewport
    cy.get('[data-testid="presentation"]').should('have.attr', 'data-expanded', 'true');

    cy.get(appFrontend.pets.decisionPanel.manualButton).click();
    manuallyAddedPets.forEach(addPet);
    assertPetOrder(manuallyAddedPets);
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
    const pets = [...petsFromCustomButton];
    assertPetOrder(pets);

    // Sort the rows from the outside
    cy.dsSelect(appFrontend.pets.sortOutside.sortOrder, 'Navn (A-Å)');
    cy.get(appFrontend.pets.sortOutside.sortButton).click();
    pets.sort((a, b) => a.name.localeCompare(b.name));
    assertPetOrder(pets);

    cy.dsSelect(appFrontend.pets.sortOutside.sortOrder, 'Alder (1-9)');
    cy.get(appFrontend.pets.sortOutside.sortButton).click();
    pets.sort((a, b) => a.age - b.age);
    assertPetOrder(pets);

    // Sort when having opened one row for editing
    cy.get(appFrontend.pets.group.tableRow(0).editButton).click();
    assertPetOrder(pets, 0);
    cy.get(appFrontend.pets.group.editContainer.species).should('have.value', Species.Cat.nb);
    cy.get(appFrontend.pets.group.editContainer.name).should('have.value', 'Reidar Reddik');
    cy.get(appFrontend.pets.group.editContainer.sortOrder).should('have.value', 'Alder (1-9)');
    cy.dsSelect(appFrontend.pets.group.editContainer.sortOrder, 'Art (Å-A)');
    cy.get(appFrontend.pets.group.editContainer.sortButton).click();

    // Species are currently sorted by the english names, even if we have selected the norwegian language
    // TODO: Update this test when the issue is fixed
    pets
      .sort((a, b) => {
        const result = Species[a.species].en.localeCompare(Species[b.species].en);
        if (result === 0) {
          return b.age - a.age;
        }
        return result;
      })
      .reverse();
    assertPetOrder(pets, 5);

    // We should still be editing the same row
    cy.get(appFrontend.pets.group.editContainer.species).should('have.value', Species.Cat.nb);
    cy.get(appFrontend.pets.group.editContainer.name).should('have.value', 'Reidar Reddik');
    cy.get(appFrontend.pets.group.editContainer.saveAndClose).clickAndGone();

    // Hiding one row via checkboxes
    cy.get(appFrontend.pets.hide._).findByRole('checkbox', { name: 'Fish med navn Siri Spinat (3 år)' }).check();
    pets[pets.findIndex((pet) => pet.name === 'Siri Spinat')].visible = false;
    assertPetOrder(pets);

    // Hiding another row via checkboxes
    cy.get(appFrontend.pets.hide._).findByRole('checkbox', { name: 'Dog med navn Preben Potet (15 år)' }).check();
    pets[pets.findIndex((pet) => pet.name === 'Preben Potet')].visible = false;
    assertPetOrder(pets);

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).should('contain.text', 'Du kan ikke ha flere dyr med samme navn og art.');

    cy.snapshot('pets');

    cy.get(appFrontend.pets.group.tableRow(0).deleteButton).click();
    const deletedIndex = pets.findIndex((pet) => pet.name === 'Birte Blomkål' && pet.age === 2);
    pets.splice(deletedIndex, 1);
    assertPetOrder(pets);

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport).should('not.exist');
  });
});
