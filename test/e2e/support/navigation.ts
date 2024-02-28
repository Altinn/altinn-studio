import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { getLocalPartyId } from 'test/e2e/support/auth';
import { getTargetUrl } from 'test/e2e/support/start-app-instance';
import type { FrontendTestTask } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

const taskMapping: { [key in FrontendTestTask]: string | undefined } = {
  message: undefined,
  changename: 'Task_2',
  group: 'Task_3',
  likert: 'Task_4',
  datalist: 'Task_5',
  confirm: undefined,
};

/**
 * This function generates javascript code to move through the instance to the desired task as quickly as possible,
 * using the gateway that lets you skip directly to a task.
 *
 * When using the goto() function, this code is injected into the app before the app itself runs, and creates
 * the instance and skips to the correct task before loading app-frontend-react.
 */
function generateEvalString(target: FrontendTestTask, extraNext: boolean) {
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

  const targetTask = taskMapping[target];
  if (!targetTask) {
    throw new Error(`No task mapping for task ${target}. You probably cannot skip to ${target} directly.`);
  }

  const taskData = { GwTargetTask: targetTask };
  const skipToTask = `
    var taskData = ${JSON.stringify(taskData)};
    var dataId = instanceData.find((data) => data.dataType === 'message').id;
    await fetch('${baseUrl}/instances/' + instanceId + '/data/' + dataId, { method: 'PUT', headers, body: JSON.stringify(taskData) });
    await fetch('${baseUrl}/instances/' + instanceId + '/process/next', { method: 'PUT', headers });
  `;

  const extraNextCode = extraNext
    ? `await fetch('${baseUrl}/instances/' + instanceId + '/process/next', { method: 'PUT', headers });`
    : '';

  const returnInstanceUrl = `
    return '${baseUrl}/#/instance/' + instanceId;
  `;

  return createInstance + skipToTask + extraNextCode + returnInstanceUrl;
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
    cy.startAppInstance(appFrontend.apps.frontendTest, { evaluateBefore: generateEvalString('changename', false) });
  },
  group: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString('group', false),
    });
  },
  likert: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString('likert', false),
    });
  },
  datalist: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString('datalist', false),
    });
  },
  confirm: () => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      evaluateBefore: generateEvalString('datalist', true),
    });
  },
};

Cypress.Commands.add('goto', (task) => {
  gotoFunctions[task]();
});
