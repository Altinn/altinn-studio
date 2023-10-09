export class Likert {
  public requiredQuestions = [
    'Hører skolen på elevenes forslag?',
    'Er dere elever med på å lage regler for hvordan dere skal ha det i klassen/gruppa?',
    'De voksne på skolen synes det er viktig at vi elever er greie med hverandre.',
  ];

  public optionalQuestions = ['Gjør du leksene dine?', 'Fungerer kalkulatoren din?', 'Er pulten din ryddig?'];

  public optionalTableTitle = 'Skolearbeid (Frivillig)';
  public requiredTableTitle = 'Medvirkning';

  public options = ['Alltid', 'Nesten alltid', 'Ofte', 'Noen ganger', 'Sjelden'];

  selectRequiredRadios() {
    cy.findByRole('table', { name: this.requiredTableTitle }).within(() => {
      this.requiredQuestions.forEach((question, index) => {
        this.selectRadio(`${question} *`, this.options[index]);
      });
    });
  }

  selectOptionalRadios() {
    cy.findByRole('table', { name: this.optionalTableTitle }).within(() => {
      this.optionalQuestions.forEach((question, index) => {
        this.selectRadio(question, this.options[index]);
      });
    });
  }

  selectRequiredRadiosInMobile() {
    this.requiredQuestions.forEach((question, index) => {
      this.selectRadioInMobile(`${question} *`, this.options[index]);
    });
  }

  selectRadio(question, option) {
    cy.findByRole('row', { name: question }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).dsCheck();
    });
  }

  selectRadioInMobile(question, option) {
    cy.findByRole('radiogroup', { name: question }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).dsCheck();
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
