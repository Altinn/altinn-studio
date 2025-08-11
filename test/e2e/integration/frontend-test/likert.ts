import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Likert } from 'test/e2e/pageobjects/likert';

const appFrontend = new AppFrontend();
const likertPage = new Likert();

function containTextCaseInsensitive(text: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (el: any) => expect(el.text().toLowerCase()).to.include(text.toLowerCase());
}

function notContainTextCaseInsensitive(text: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (el: any) => expect(el.text().toLowerCase()).not.to.include(text.toLowerCase());
}

describe('Likert', () => {
  it('Should show validation message for required likert', () => {
    cy.goto('likert');
    cy.get(appFrontend.sendinButton).click();

    cy.get(appFrontend.fieldValidation('likert-group-required-item-3')).should(
      containTextCaseInsensitive(`Du må fylle ut ${likertPage.requiredQuestions[0]}`),
    );
    cy.get(appFrontend.fieldValidation('likert-group-required-item-4')).should(
      containTextCaseInsensitive(`Du må fylle ut ${likertPage.requiredQuestions[1]}`),
    );
    cy.get(appFrontend.fieldValidation('likert-group-required-item-5')).should(
      containTextCaseInsensitive(`Du må fylle ut ${likertPage.requiredQuestions[2]}`),
    );

    // Check the second required question and take a snapshot
    likertPage.selectRadioDesktop(likertPage.requiredQuestions[1], likertPage.options[1]);
    cy.get(appFrontend.fieldValidation('likert-group-required-item-4')).should(
      notContainTextCaseInsensitive(`Du må fylle ut ${likertPage.requiredQuestions[1]}`),
    );
    cy.visualTesting('likert');
  });

  it('Should fill out optional likert and see results in summary component', () => {
    cy.goto('likert');
    cy.findByRole('table', { name: likertPage.optionalTableTitle }).within(() => {
      cy.findByText('Spørsmål');
    });
    likertPage.selectRadioDesktop(likertPage.optionalQuestions[0], likertPage.options[2]);
    likertPage.selectRadioDesktop(likertPage.optionalQuestions[1], likertPage.options[1]);
    likertPage.selectRadioDesktop(likertPage.optionalQuestions[2], likertPage.options[1]);
    cy.get('[data-testid=summary-summary1]').should(($summary) => {
      const text = $summary.text();

      expect(text).to.match(likertPage.optionalTableTitle);
      expect(text).to.contain(`${likertPage.optionalQuestions[0]} : ${likertPage.options[2]}`);
      expect(text).to.contain(`${likertPage.optionalQuestions[1]} : ${likertPage.options[1]}`);
      expect(text).to.contain(`${likertPage.optionalQuestions[2]} : ${likertPage.options[1]}`);
    });
  });
});
