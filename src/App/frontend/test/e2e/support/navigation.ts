import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { getLocalPartyId } from 'test/e2e/support/auth';
import { getTargetUrl } from 'test/e2e/support/start-app-instance';
import type { FrontendTestTask, StartAppInstanceOptions } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

const taskMapping: { [key in FrontendTestTask]: string | undefined } = {
  message: undefined,
  changename: 'Task_2',
  group: 'Task_3',
  likert: 'Task_4',
  datalist: 'Task_5',
  confirm: undefined,
};

interface Context {
  baseUrl: string;
}

interface ExtraOutput {
  code: string;
  urlSuffix?: string;
}

type Extras = (context: Context) => ExtraOutput;

/**
 * This function generates javascript code to move through the instance to the desired task as quickly as possible,
 * using the gateway that lets you skip directly to a task.
 *
 * When using the goto() function, this code is injected into the app before the app itself runs, and creates
 * the instance and skips to the correct task before loading app-frontend-react.
 */
function generateEvalString(target: FrontendTestTask, extra?: Extras): string {
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

  const extras = extra ? extra({ baseUrl }) : { code: '' };
  const returnInstanceUrl = `
    return '${baseUrl}/#/instance/' + instanceId + '${extras.urlSuffix || ''}';
  `;

  return createInstance + skipToTask + extras.code + returnInstanceUrl;
}

/**
 * Functions used by goto() to quickly pretend to fill out a certain layout.
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 * It never generates a PDF for the previous tasks.
 */
const gotoFunctions: { [key in FrontendTestTask]: (extra?: Extras, startOptions?: StartAppInstanceOptions) => void } = {
  message: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    cy.intercept('**/active', []).as('noActiveInstances');
    if (extra) {
      throw new Error('Extra not supported for message navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
  },
  changename: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      evaluateBefore: generateEvalString('changename', extra),
    });
  },
  group: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for group navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      evaluateBefore: generateEvalString('group'),
    });
  },
  likert: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for likert navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      evaluateBefore: generateEvalString('likert'),
    });
  },
  datalist: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for datalist navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      evaluateBefore: generateEvalString('datalist'),
    });
  },
  confirm: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for confirm navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      evaluateBefore: generateEvalString('datalist', ({ baseUrl }) => ({
        code: `await fetch('${baseUrl}/instances/' + instanceId + '/process/next', { method: 'PUT', headers });`,
      })),
    });
  },
};

Cypress.Commands.add('goto', (task, options) => {
  gotoFunctions[task](undefined, options);
  cy.findByRole('progressbar').should('not.exist');
});

Cypress.Commands.add('gotoHiddenPage', (target) => {
  gotoFunctions.changename(({ baseUrl }) => ({
    urlSuffix: `/Task_2/${target}`,
    code: [
      `var instanceDataNew = await fetch('${baseUrl}/instances/' + instanceId, { headers }).then((res) => res.json());`,
      `var changeNameModel = instanceDataNew.data.find((data) => data.dataType === 'ServiceModel-test');`,
      `var dataModel = await fetch('${baseUrl}/instances/' + instanceId + '/data/' + changeNameModel.id, { headers }).then((res) => res.json());`,
      `dataModel['NyttNavn-grp-9313'] = {
        'NyttNavn-grp-9314': {
          'PersonFornavnNytt-datadef-34758': { value: 'a' },
          'PersonBekrefterNyttNavn': { value: 'Ja' },
        }
      }`,
      `dataModel.ChooseExtraPages = "${target}";`,
      `await fetch('${baseUrl}/instances/' + instanceId + '/data/' + changeNameModel.id,
        { method: 'PUT', headers, body: JSON.stringify(dataModel) });`,
    ].join('\n'),
  }));
  cy.findByRole('progressbar').should('not.exist');
});
