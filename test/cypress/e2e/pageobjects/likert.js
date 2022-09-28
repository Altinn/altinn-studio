export class Likert {
  constructor() {
    this.requiredQuestions = [
      'Hører skolen på elevenes forslag?',
      'Er dere elever med på å lage regler for hvordan dere skal ha det i klassen/gruppa?',
      'De voksne på skolen synes det er viktig at vi elever er greie med hverandre.',
    ];

    this.optionalQuestions = ['Gjør du leksene dine?', 'Fungerer kalkulatoren din?', 'Er pulten din ryddig?'];

    this.optionalTableTitle = 'Skolearbeid (Frivillig)';
    this.requiredTableTitle = 'Medvirkning';

    this.options = ['Alltid', 'Nesten alltid', 'Ofte', 'Noen ganger', 'Sjelden'];
  }

  selectRequiredRadios() {
    cy.findByRole('table', { name: this.requiredTableTitle }).within(() => {
      this.requiredQuestions.forEach((question, index) => {
        this.selectRadio(question + '*', this.options[index]);
      });
    });
  }

  selectRequiredRadiosInMobile() {
    this.requiredQuestions.forEach((question, index) => {
      this.selectRadioInMobile(question + '*', this.options[index]);
    });
  }

  selectRadio(question, option) {
    cy.findByRole('row', { name: question }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).click();
    });
  }

  selectRadioInMobile(question, option) {
    cy.findByRole('radiogroup', { name: question }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).click();
    });
  }

  assertOptionalLikertColumnHeaders() {
    cy.findByRole('table', { name: this.optionalTableTitle }).within(() => {
      cy.findByRole('columnheader', { name: 'Spørsmål' });
      this.options.forEach((option) => {
        cy.findByRole('columnheader', { name: option });
      });
    });
  }
}
