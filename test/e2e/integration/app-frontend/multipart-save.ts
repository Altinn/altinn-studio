import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { v4 as uuid } from 'uuid';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IFormData } from 'src/features/form/data';
import type { IBackendFeaturesState } from 'src/shared/resources/applicationMetadata';

const appFrontend = new AppFrontend();

interface MultipartReq {
  id: string;
  matched: false | string;
  dataModel: IFormData;
  previousValues: IFormData;
}

describe('Multipart save', () => {
  const requests: MultipartReq[] = [];
  const awaitingMatch: { [message: string]: string[] } = {};

  /**
   * This is not supported by 'frontend-test' yet, so we'll simulate the functionality by intercepting the requests
   * and rewriting them to something the backend currently supports. In the process, we can verify that the
   * functionality works on the frontend.
   */
  function simulateMultipartSave() {
    cy.intercept('GET', '**/applicationmetadata', (req) => {
      req.on('response', (res) => {
        res.body.features = {
          multiPartSave: true,
        } as IBackendFeaturesState;
      });
    });
    cy.intercept('PUT', '**/instances/**/data/*', (req) => {
      const contentType = req.headers['content-type']?.toString();
      if (contentType.startsWith('multipart/form-data')) {
        const { dataModel, previousValues } = dirtyMultiPartParser(contentType, req.body);
        requests.push({
          id: uuid(),
          matched: false,
          dataModel: dot.dot(dataModel),
          previousValues,
        });
        req.body = JSON.stringify(dataModel);
        req.headers['content-type'] = 'application/json';
        delete req.headers['content-length'];
      }
      req.continue();
    }).as('multipartSave');
  }

  function expectReq(cb: (req: MultipartReq) => boolean, customMessage: string, errorMsg: string) {
    awaitingMatch[customMessage] = awaitingMatch[customMessage] || [];
    awaitingMatch[customMessage].push('waiting');
    cy.waitUntil(
      () => {
        for (const idx in requests) {
          const req = requests[idx];
          if (!req.matched && cb(req)) {
            requests[idx].matched = customMessage;
            const foundIndex = awaitingMatch[customMessage].findIndex((val) => val === 'waiting');
            if (foundIndex > -1) {
              awaitingMatch[customMessage][foundIndex] = req.id;
            } else {
              throw new Error('Unable to find log item for request waiting for match');
            }
            return true;
          }
        }

        return false;
      },
      {
        description: 'save',
        customMessage,
        errorMsg,
        timeout: 20 * 1000,
      },
    );
  }

  function expectSave(key: string, newValue: any, prevValue: any) {
    const newValueString = newValue === undefined ? 'undefined' : JSON.stringify(newValue);
    const prevValueString = prevValue === null ? 'null' : JSON.stringify(prevValue);
    const msg = `${key} => ${newValueString} (was ${prevValueString})`;
    expectReq(
      (req) => {
        let val: any = req.dataModel[key];
        if (val !== newValue && val === undefined) {
          return false;
        }

        if (Array.isArray(newValue) && Array.isArray(prevValue)) {
          // Crude workaround for checkboxes not supporting array storage. We'll split the value and sort the results
          // in order to not rely on the order of saving these.
          newValue.sort();
          prevValue.sort();
          val = val.split(',').sort();
          if (typeof req.previousValues[key] === 'string') {
            req.previousValues[key] = req.previousValues[key].split(',').sort() as any;
          }
        }

        return deepEqual(val, newValue) && deepEqual(req.previousValues, { [key]: prevValue });
      },
      msg,
      `Failed to assert that saving occurred with ${msg}`,
    );
  }

  it('Multipart saving with groups', () => {
    cy.goto('group');

    // We need to reload the app for it to recognize the features changed. We don't expect the backend features to
    // change while a user is working in the same session, so there is no automatic detection for this.
    simulateMultipartSave();
    cy.reload();

    cy.get(appFrontend.nextButton).click();

    // Checking the checkbox should update with a 'null' previous value
    const root = 'Endringsmelding-grp-9786';
    const showGroupKey = `${root}.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.value`;
    cy.get(appFrontend.group.showGroupToContinue).find('input').check({ force: true }).blur();
    expectSave(showGroupKey, 'Ja', null);

    // And then unchecking it should do the inverse
    cy.get(appFrontend.group.showGroupToContinue).find('input').uncheck({ force: true }).blur();
    expectSave(showGroupKey, undefined, 'Ja');

    cy.get(appFrontend.group.showGroupToContinue).find('input').check({ force: true }).blur();
    expectSave(showGroupKey, 'Ja', null);

    const groupKey = `${root}.OversiktOverEndringene-grp-9788`;
    const currentValueKey = 'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value';
    const newValueKey = 'SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value';
    const subGroupKey = 'nested-grp-1234';
    const commentKey = 'SkattemeldingEndringEtterFristKommentar-datadef-37133.value';

    function addRow(index: number, oldValue: string, newValue: string, comment) {
      cy.get(appFrontend.group.addNewItem).click();
      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.next).click();
      expectSave(`${groupKey}[${index}].${subGroupKey}[0].source`, 'altinn', null);
      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.back).click();

      cy.get(appFrontend.group.currentValue).should('be.visible').type(oldValue).blur();
      expectSave(`${groupKey}[${index}].${currentValueKey}`, oldValue, null);

      cy.get(appFrontend.group.newValue).should('be.visible').type(newValue).blur();
      expectSave(`${groupKey}[${index}].${newValueKey}`, newValue, null);

      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.next).click();
      cy.get(appFrontend.group.comments).should('be.visible').type(comment).blur();
      expectSave(`${groupKey}[${index}].${subGroupKey}[0].${commentKey}`, comment, null);

      cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
      cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
    }

    // Add some rows to the group
    addRow(0, '1', '2', 'first comment');
    addRow(1, '1234', '5678', 'second comment');

    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.newValue).type('2').blur();
    expectSave(`${groupKey}[0].${newValueKey}`, '22', '2');
    cy.get(appFrontend.group.newValue).clear().type('2').blur();
    expectSave(`${groupKey}[0].${newValueKey}`, '2', '22');

    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.addNewItemSubGroup).click();
    expectSave(`${groupKey}[0].${subGroupKey}[1].source`, 'altinn', null);

    cy.get(appFrontend.group.comments).type('third comment in first row').blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].${commentKey}`, 'third comment in first row', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedDynamics).click({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptionsToggle`, 'Ja', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).check({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, 'o111', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).check({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1'], ['o111']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[0]).check({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1', 'o11'], ['o111', 'o1']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).uncheck({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o1', 'o11'], ['o111', 'o1', 'o11']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).uncheck({ force: true }).blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o11'], ['o1', 'o11']);

    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.group.row(0).deleteBtn).click();
    expectReq(
      (req) => {
        const relevantEntries = Object.entries(req.dataModel).filter(([k]) => k.startsWith(groupKey));
        const relevantModel = Object.fromEntries(relevantEntries);
        const expectedModel = {
          // Group should now just have one row (we deleted the first one)
          [`${groupKey}[0].${currentValueKey}`]: '1234',
          [`${groupKey}[0].${newValueKey}`]: '5678',
          [`${groupKey}[0].${subGroupKey}[0].source`]: 'altinn',
          [`${groupKey}[0].${subGroupKey}[0].${commentKey}`]: 'second comment',
        };

        const expectedPrevValues = {
          [`${groupKey}[0].${currentValueKey}`]: '1',
          [`${groupKey}[0].${newValueKey}`]: '2',

          // This following is not present, because it never really changed (previous value is the same as new value):
          // [`${groupKey}[0].${subGroupKey}[0].source`]: 'altinn',
          [`${groupKey}[0].${subGroupKey}[0].${commentKey}`]: 'first comment',

          [`${groupKey}[0].${subGroupKey}[1].source`]: 'altinn',
          [`${groupKey}[0].${subGroupKey}[1].${commentKey}`]: 'third comment in first row',
          [`${groupKey}[0].${subGroupKey}[1].extraOptionsToggle`]: 'Ja',
          [`${groupKey}[0].${subGroupKey}[1].extraOptions`]: 'o11',

          [`${groupKey}[1].${currentValueKey}`]: '1234',
          [`${groupKey}[1].${newValueKey}`]: '5678',
          [`${groupKey}[1].${subGroupKey}[0].source`]: 'altinn',
          [`${groupKey}[1].${subGroupKey}[0].${commentKey}`]: 'second comment',
        };

        return deepEqual(relevantModel, expectedModel) && deepEqual(req.previousValues, expectedPrevValues);
      },
      'first row deleted',
      'failed to assert first row deletion',
    );

    cy.get(appFrontend.group.row(0).deleteBtn).click();
    expectReq(
      (req) => {
        const relevantKeys = Object.keys(req.dataModel).filter((k) => k.startsWith(groupKey));
        const expectedPrevValues = {
          [`${groupKey}[0].${currentValueKey}`]: '1234',
          [`${groupKey}[0].${newValueKey}`]: '5678',
          [`${groupKey}[0].${subGroupKey}[0].source`]: 'altinn',
          [`${groupKey}[0].${subGroupKey}[0].${commentKey}`]: 'second comment',
        };

        return relevantKeys.length === 0 && deepEqual(req.previousValues, expectedPrevValues);
      },
      'second row deleted',
      'failed to assert second row deletion',
    );

    // Ensure there are no more unmatched save requests in the queue afterwards
    cy.waitUntil(() => requests.filter((r) => r.matched === false).length === 0, {
      timeout: 20 * 1000,
      customMessage: 'All requests to be matched',
      errorMsg: 'Some requests failed to be matched',
    });
  });

  // If the test fails, store a JSON file detailing all the intercepted save requests (in order) along with
  // which expectation they matched (and which are left to match)
  afterEach(function () {
    if (this.currentTest?.state === 'failed') {
      const random = Math.floor(Math.random() * 1000 * 1000);
      const fileName = `multiPartSave-requests-${random}.json`;
      // const onlyAwaitingMatch = Object.entries(awaitingMatch).filter(([, num]) => num !== 0);
      const debugContent = {
        requests,
        awaitingMatch,
      };

      cy.writeFile(`test/redux-history/${fileName}`, JSON.stringify(debugContent, null, 2));
    }
  });
});

/**
 * Cypress does not parse the multiPart content for us, so instead of pulling in a dependency just to do that, we'll
 * just haphazardly parse it. We only care about the happy-path here anyway, and we'll let the test fail if our parsing
 * fails. This is not running in production code, just our test suite.
 */
function dirtyMultiPartParser(contentType: string, body: string): { [key: string]: any } {
  const boundaryHeader = contentType.split(';')[1];
  const boundary = boundaryHeader.split('boundary=')[1];
  const parts = body
    .split(boundary)
    .map((s) => s.trim())
    .filter((p) => p !== '--');

  const out = {};
  for (const part of parts) {
    const innerParts = part.split('\r\n\r\n', 2);
    const nameMatch = innerParts[0].match(/name=["'](.*?)["']/);
    if (nameMatch && nameMatch[1]) {
      out[nameMatch[1]] = JSON.parse(innerParts[1].replace(/--$/, ''));
    }
  }

  return out;
}
