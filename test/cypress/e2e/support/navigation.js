import AppFrontend from '../pageobjects/app-frontend';
import Common from '../pageobjects/common';
import * as texts from '../fixtures/texts.json';
import { Likert } from '../pageobjects/likert';
import { Datalist } from '../pageobjects/datalist';

const appFrontend = new AppFrontend();
const mui = new Common();
const dataListPage = new Datalist();

/**
 * This object contains a valid data model for each of the tasks that can be fast-skipped. To produce one such data
 * model, fill out the form with valid data and grab the current redux formData state.
 *
 * This is used to inject into the instance data when fast-skipping through an instance to reach the desired task
 * when using goto(..., 'fast')
 */
const validMinimalData = {
  changename: {
    'skjemanummer': '1533',
    'spesifikasjonsnummer': '11172',
    'blankettnummer': 'RF-1453',
    'tittel': 'Endring av navn',
    'gruppeid': '9308',
    'Radioknapp': '1',
    'Innledning-grp-9309.gruppeid': '9309',
    'Innledning-grp-9309.Signerer-grp-9320.gruppeid': '9320',
    'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraReferanseAltinn-datadef-34751.orid': '34751',
    'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraReferanseAltinn-datadef-34751.value': 'altinn',
    'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraArkivDato-datadef-34752.value': '2022-11-22',
    'Innledning-grp-9309.Kontaktinformasjon-grp-9311.gruppeid': '9311',
    'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.orid': '34735',
    'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.value': 'Ola Nordmann',
    'Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value': 'hello world task is being skipped',
    'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value': 'hello world',
    'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonEtternavnNytt-datadef-34757.value': 'task is being skipped',
    'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonBekrefterNyttNavn.value': 'Ja',
    'Tilknytning-grp-9315.TilknytningTilNavnet-grp-9316.TilknytningEtternavn1-grp-9350.PersonEtternavnForste-datadef-34896.value': 'asdfasdf2'
  },
  group: {
    'skjemanummer': '1603',
    'spesifikasjonsnummer': '12392',
    'blankettnummer': 'RF-1366',
    'tittel': 'Endringsmelding',
    'gruppeid': '9785',
    'Endringsmelding-grp-9786.gruppeid': '9786',
    'Endringsmelding-grp-9786.Avgiver-grp-9787.gruppeid': '9787',
    'Endringsmelding-grp-9786.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.orid': '27688',
    'Endringsmelding-grp-9786.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.value': 'Ja',
    'Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value': 'skipping to likert'
  },
};

function endTaskWithData(data) {
  cy.get('#toNextTask').should('be.visible');
  cy.reduxDispatch({
    type: 'formData/setFulfilled',
    payload: {
      formData: data
    }
  });

  cy.get('#toNextTask').click();
  cy.get('#toNextTask').should('not.exist');
}

function genericSendIn() {
  cy.get(appFrontend.sendinButton).click();
  cy.get(appFrontend.sendinButton).should('not.exist');
}

/**
 * Functions used by goto() to fill out a certain layout using the fast mode (skipping form-filling).
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 */
const completeFormFast = {
  message: () => {
    completeFormSlow.message();
    genericSendIn();
  },
  changename: () => endTaskWithData(validMinimalData.changename),
  group: () => {
    endTaskWithData(validMinimalData.group);
  },
  likert: () => {
    // TODO: Add fast data and skip button for likert?
    completeFormSlow.likert();
    genericSendIn();
  },
  datalist: () => {
    cy.contains(mui.button, texts.next).click();
    genericSendIn();
  },
  confirm: () => {
    genericSendIn();
  },
};

/**
 * Functions used by goto() to fill out a certain layout using the slow mode (filling out the form as usual).
 * These should never complete the form fully, but rather stop at the last page of each task (see the sendInTask object
 * below for how each of these should send in their data).
 */
const completeFormSlow = {
  message: () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.wait('@createInstance');
    cy.get(appFrontend.closeButton).should('be.visible');
  },
  changename: () => {
    cy.get(appFrontend.changeOfName.currentName)
      .should('be.visible')
      .then(() => {
        cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('a').blur();
        cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('a').blur();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
        cy.get(appFrontend.changeOfName.reasonRelationship).should('be.visible').click().type('test');
        cy.get(appFrontend.changeOfName.dateOfEffect)
          .siblings()
          .children(mui.buttonIcon)
          .click()
          .then(() => {
            cy.get(mui.selectedDate).should('be.visible').click();
          });
        cy.get(appFrontend.changeOfName.upload).selectFile('e2e/fixtures/test.pdf', { force: true });
        cy.contains(mui.button, texts.next).click();
      });
  },
  group: () => {
    const mkFile = (fileName) => ({
      fileName,
      mimeType: 'application/pdf',
      lastModified: Date.now(),
      contents: Cypress.Buffer.from('hello world'),
    });

    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    cy.addItemToGroup(1, 2, 'automation');
    cy.get(appFrontend.group.rows[0].editBtn).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.rows[0].uploadSingle.dropZone).selectFile(mkFile('attachment-in-single.pdf'), {
      force: true,
    });
    cy.get(appFrontend.group.rows[0].uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi1.pdf'), {
      force: true,
    });
    cy.get(appFrontend.group.rows[0].uploadMulti.addMoreBtn).click();
    cy.get(appFrontend.group.rows[0].uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi2.pdf'), {
      force: true,
    });
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].editBtn).click();
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.dropZone).selectFile(
      mkFile('attachment-in-nested.pdf'),
      { force: true },
    );
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.attachments[0].tagSelector)
      .should('be.visible')
      .select('altinn');
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.attachments[0].tagSave).click();
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.attachments[0].tagSelector).should('not.exist');

    cy.intercept('GET', '**/options/*').as('getOptions');
    cy.get('#nested-source-0-0').should('exist').and('be.visible').select('Annet');
    cy.wait('@getOptions');
    cy.get('#nested-reference-0-0').should('exist').and('be.visible').select('Test');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get('#source-0').should('exist').and('be.visible').select('Digitaliseringsdirektoratet');
    cy.wait(['@getOptions', '@getOptions']);
    cy.get('#reference-0').should('exist').and('be.visible').select('Sophie Salt');

    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');

    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.sendersName).should('be.visible').type('automation');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.summaryText).should('be.visible');
  },
  likert: () => {
    const likertPage = new Likert();
    likertPage.selectRequiredRadios();
  },
  datalist: () => {
    cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').click();
    cy.contains(mui.button, texts.next).click();
  },
  confirm: () => {},
};

const sendInTask = {
  message: genericSendIn,
  changename: genericSendIn,
  group: genericSendIn,
  likert: genericSendIn,
  datalist: genericSendIn,
  confirm: () => {
    cy.get(appFrontend.confirm.sendIn).should('be.visible').click();
    cy.get(appFrontend.confirm.sendIn).should('not.exist');
  },
};

let currentTask = undefined;

Cypress.Commands.add('goto', (task, _mode) => {
  const mode = _mode === undefined ? 'fast' : _mode;
  const rules = mode === 'fast' ? completeFormFast : completeFormSlow;
  const tasks = Object.keys(rules);
  const previousTasks = tasks.slice(0, tasks.indexOf(task));
  for (const prevTask of previousTasks) {
    cy.log(
      mode === 'fast'
        ? `Skipping trough ${prevTask} in order to reach ${task}`
        : `Filling out ${prevTask} in order to reach ${task}`,
    );
    rules[prevTask]();
    if (mode !== 'fast') {
      sendInTask[prevTask]();
    }
  }
  currentTask = task;
});

Cypress.Commands.add('gotoAndComplete', (task, mode) => {
  if (currentTask !== task) {
    cy.goto(task, mode);
  }
  cy.log(`Filling out ${task}`);
  completeFormSlow[task]();
  currentTask = task;
});

Cypress.Commands.add('sendIn', (task) => {
  sendInTask[task || currentTask]();

  const tasks = Object.keys(completeFormFast);
  currentTask = tasks[tasks.indexOf(task || currentTask) + 1];
});
