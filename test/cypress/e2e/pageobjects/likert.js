export class Likert {
  constructor() {
    this.requiredQuestion1 = /Hører skolen på elevenes forslag/i;
    this.requiredQuestion2 = /Er dere elever med på å lage regler for hvordan dere skal ha det i klassen/i;
    this.requiredQuestion3 = /De voksne på skolen synes det er viktig at vi elever er greie med hverandre/i;

    this.option1 = /Alltid/;
    this.option2 = /nesten alltid/i;
    this.option3 = /ofte/i;
  }

  selectRequiredRadios() {
    cy.findByRole('table', { name: 'Medvirkning' }).within(() => {
      cy.findByRole('radiogroup', { name: this.requiredQuestion1 }).within(() => {
        cy.findByRole('radio', { name: this.option1 }).click();
      });
      cy.findByRole('radiogroup', {
        name: this.requiredQuestion2,
      }).within(() => {
        cy.findByRole('radio', { name: this.option2 }).click();
      });
      cy.findByRole('radiogroup', {
        name: this.requiredQuestion3,
      }).within(() => {
        cy.findByRole('radio', { name: this.option3 }).click();
      });
    });
  }

  selectRequiredRadiosInMobile() {
    cy.findByRole('radiogroup', { name: this.requiredQuestion1 }).within(() => {
      cy.findByRole('radio', { name: this.option1 }).click();
    });
    cy.findByRole('radiogroup', { name: this.requiredQuestion2 }).within(() => {
      cy.findByRole('radio', { name: this.option2 }).click();
    });
    cy.findByRole('radiogroup', { name: this.requiredQuestion3 }).within(() => {
      cy.findByRole('radio', { name: this.option3 }).click();
    });
  }
}
