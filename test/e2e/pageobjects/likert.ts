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

  selectRadio(question, option) {
    cy.findByRole('radiogroup', { name: new RegExp(question) }).within(() => {
      cy.findByRole('radio', { name: new RegExp(option) }).check();
    });
  }
}
