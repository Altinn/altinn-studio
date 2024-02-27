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
    cy.findByRole('group', { name: this.requiredTableTitle }).within(() => {
      this.requiredQuestions.forEach((question, index) => {
        this.selectRadio(`${question} *`, this.options[index]);
      });
    });
  }

  selectOptionalRadios() {
    cy.findByRole('group', { name: this.optionalTableTitle }).within(() => {
      this.optionalQuestions.forEach((question, index) => {
        this.selectRadio(question, this.options[index]);
      });
    });
  }

  selectRadio(question, option) {
    cy.findByRole('radiogroup', { name: new RegExp(question) }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).check();
    });
  }

  assertOptionalLikertColumnHeaders() {
    cy.findByRole('group', { name: this.optionalTableTitle }).within(() => {
      cy.findByText('Spørsmål');
    });
  }
}
