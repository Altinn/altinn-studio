import dot from 'dot-object';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { getLocalPartyId } from 'test/e2e/support/auth';
import { getTargetUrl } from 'test/e2e/support/start-app-instance';
import type { FrontendTestTask } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

/**
 * This object contains a valid data model for each of the tasks that can be fast-skipped. To produce one such data
 * model, fill out the form with valid data and grab the current redux formData state.
 *
 * This is used to inject into the instance data when fast-skipping through an instance to reach the desired task
 * when using goto(...)
 */
const validMinimalData = {
  message: {
    modelName: 'message',
    data: {},
  },
  changename: {
    modelName: 'ServiceModel-test',
    data: {
      skjemanummer: '1533',
      spesifikasjonsnummer: '11172',
      blankettnummer: 'RF-1453',
      tittel: 'Endring av navn',
      gruppeid: '9308',
      Radioknapp: '1',
      'GridData.TotalGjeld': '1000000',
      'GridData.Bolig.Prosent': '80',
      'GridData.Studie.Prosent': '15',
      'GridData.Kredittkort.Prosent': '5',
      'Innledning-grp-9309.gruppeid': '9309',
      'Innledning-grp-9309.Signerer-grp-9320.gruppeid': '9320',
      'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraReferanseAltinn-datadef-34751.orid': '34751',
      'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraReferanseAltinn-datadef-34751.value': 'altinn',
      'Innledning-grp-9309.Signerer-grp-9320.SignererEkstraArkivDato-datadef-34752.value': '2022-11-22',
      'Innledning-grp-9309.Kontaktinformasjon-grp-9311.gruppeid': '9311',
      'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.orid': '34735',
      'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.value': 'Ola Nordmann',
      'Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value':
        'hello world task is being skipped',
      'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value': 'hello world',
      'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonEtternavnNytt-datadef-34757.value': 'task is being skipped',
      'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonBekrefterNyttNavn.value': 'Ja',
      'Tilknytning-grp-9315.TilknytningTilNavnet-grp-9316.TilknytningEtternavn1-grp-9350.PersonEtternavnForste-datadef-34896.value':
        'asdfasdf2',
    },
  },
  group: {
    modelName: 'nested-group',
    data: {
      skjemanummer: '1603',
      spesifikasjonsnummer: '12392',
      blankettnummer: 'RF-1366',
      tittel: 'Endringsmelding',
      gruppeid: '9785',
      'Endringsmelding-grp-9786.gruppeid': '9786',
      'Endringsmelding-grp-9786.Avgiver-grp-9787.gruppeid': '9787',
      'Endringsmelding-grp-9786.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.orid': '27688',
      'Endringsmelding-grp-9786.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.value': 'Ja',
      'Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value': 'skipping to likert',
    },
  },
  likert: {
    modelName: 'likert',
    data: {
      'Questions[0].Id': 'question-1',
      'Questions[1].Id': 'question-2',
      'Questions[2].Id': 'question-3',
      'Questions[3].Id': 'question-4',
      'Questions[4].Id': 'question-5',
      'Questions[5].Id': 'question-6',
      'Questions[3].Answer': '1',
      'Questions[4].Answer': '2',
      'Questions[5].Answer': '3',
    },
  },
  datalist: {
    modelName: 'datalist',
    data: {
      SelectedItem: 'Caroline',
      SelectedItemProfession: 'Utvikler',
    },
  },
};

/**
 * This function generates javascript code to move through the instance to the desired task as quickly as possible.
 * When using the goto() function, this code is injected into the app before the app itself runs, and loads
 * the data model content from validMinimalData, injects into the data object, and pushes the process forward as quickly
 * as possible.
 */
function generateEvalString(submitTasks: (keyof typeof validMinimalData)[]) {
  const baseUrl = getTargetUrl(appFrontend.apps.frontendTest);
  const fullPartyId = getLocalPartyId('default');

  // Hard-coded partyId for now, since I couldn't figure out a way to get it from the app.
  // This is the one used on tt02.
  const partyId = fullPartyId ? fullPartyId.split('.')[1] : 50085642;

  const instantiateUrl = `${baseUrl}/instances?instanceOwnerPartyId=${partyId}`;
  const createInstance = `
    const partyId = ${JSON.stringify(partyId)};
    const xsrfCookie = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN=')).split('=')[1];
    const headers = { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfCookie };
    const instanceCreated = await fetch(${JSON.stringify(instantiateUrl)}, { method: 'POST', headers });
    var instance = await instanceCreated.json();
    const instanceId = instance.id;
    var instanceData = instance.data;
  `;

  const submitTasksScripts = submitTasks.map((task) => {
    const taskData = validMinimalData[task];
    const modelName = taskData.modelName;
    const fullObject = dot.object(taskData.data);
    const isLastTask = submitTasks.indexOf(task) === submitTasks.length - 1;

    let output = `
      var taskData = ${JSON.stringify(fullObject)};
      var dataId = instanceData.find((data) => data.dataType === '${modelName}').id;
      await fetch('${baseUrl}/instances/' + instanceId + '/data/' + dataId, { method: 'PUT', headers, body: JSON.stringify(taskData) });
      await fetch('${baseUrl}/instances/' + instanceId + '/process/next', { method: 'PUT', headers });
    `;

    if (!isLastTask) {
      output += `
        instance = await (await fetch('${baseUrl}/instances/' + instanceId, { method: 'GET', headers })).json();
        instanceData = instance.data;
      `;
    }

    return output;
  });

  const returnInstanceUrl = `
    return '${baseUrl}/#/instance/' + instanceId;
  `;

  return createInstance + submitTasksScripts.join('\n') + returnInstanceUrl;
}

/**
 * Functions used by goto() to quickly pretend to fill out a certain layout.
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 * It never generates a PDF for the previous tasks.
 */
const gotoFunctions: { [key in FrontendTestTask]: () => void } = {
  message: () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
  },
  changename: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, { evaluateBefore: generateEvalString(['message']) });
  },
  group: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString(['message', 'changename']),
    });
  },
  likert: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString(['message', 'changename', 'group']),
    });
  },
  datalist: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString(['message', 'changename', 'group', 'likert']),
    });
  },
  confirm: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString(['message', 'changename', 'group', 'likert', 'datalist']),
    });
  },
};

Cypress.Commands.add('goto', (task) => {
  gotoFunctions[task]();
});
