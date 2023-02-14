import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import AppFrontend from 'test/e2e/pageobjects/app-frontend';

import type { IFormData } from 'src/features/form/data';
import type { IBackendFeaturesState } from 'src/shared/resources/applicationMetadata';

const appFrontend = new AppFrontend();

interface MultipartReq {
  dataModel: IFormData;
  previousValues: IFormData;
}

describe('Multipart save', () => {
  const requests: (MultipartReq | undefined)[] = [];

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
    cy.waitUntil(
      () => {
        for (const idx in requests) {
          const req = requests[idx];
          if (req && cb(req)) {
            requests[idx] = undefined;
            return true;
          }
        }

        return false;
      },
      {
        description: 'save',
        customMessage,
        errorMsg,
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
    cy.get(appFrontend.group.showGroupToContinue).find('input').check().blur();
    expectSave(showGroupKey, 'Ja', null);

    // And then unchecking it should do the inverse
    cy.get(appFrontend.group.showGroupToContinue).find('input').uncheck().blur();
    expectSave(showGroupKey, undefined, 'Ja');

    cy.get(appFrontend.group.showGroupToContinue).find('input').check().blur();
    expectSave(showGroupKey, 'Ja', null);

    const groupKey = `${root}.OversiktOverEndringene-grp-9788`;
    const currentValueKey = 'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value';
    const newValueKey = 'SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value';
    const subGroupKey = 'nested-grp-1234';
    const commentKey = 'SkattemeldingEndringEtterFristKommentar-datadef-37133.value';

    // Add a simple item to the group
    cy.addItemToGroup(1, 2, 'first comment');
    expectSave(`${groupKey}[0].${currentValueKey}`, '1', null);
    expectSave(`${groupKey}[0].${newValueKey}`, '2', null);
    expectSave(`${groupKey}[0].${subGroupKey}[0].source`, 'altinn', null);
    expectSave(`${groupKey}[0].${subGroupKey}[0].${commentKey}`, 'first comment', null);

    cy.addItemToGroup(1234, 5678, 'second comment');
    expectSave(`${groupKey}[1].${currentValueKey}`, '1234', null);
    expectSave(`${groupKey}[1].${newValueKey}`, '5678', null);
    expectSave(`${groupKey}[1].${subGroupKey}[0].source`, 'altinn', null);
    expectSave(`${groupKey}[1].${subGroupKey}[0].${commentKey}`, 'second comment', null);

    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.addNewItemSubGroup).click();
    expectSave(`${groupKey}[0].${subGroupKey}[1].source`, 'altinn', null);

    cy.get(appFrontend.group.comments).type('third comment in first row');
    expectSave(`${groupKey}[0].${subGroupKey}[1].${commentKey}`, 'third comment in first row', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedDynamics).click();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptionsToggle`, 'Ja', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).check().blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, 'o111', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).check().blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1'], ['o111']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[0]).check().blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1', 'o11'], ['o111', 'o1']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).uncheck().blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o1', 'o11'], ['o111', 'o1', 'o11']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).uncheck().blur();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o11'], ['o1', 'o11']);

    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.group.row(0).deleteBtn).click();
    expectReq(
      (req) => {
        const relevantEntries = Object.entries(req.dataModel).filter(([k]) => k.startsWith(groupKey));
        const expectedEntries = [
          // Group should now just have one row (we deleted the first one)
          [`${groupKey}[0].${currentValueKey}`, '1234'],
          [`${groupKey}[0].${newValueKey}`, '5678'],
          [`${groupKey}[0].${subGroupKey}[0].source`, 'altinn'],
          [`${groupKey}[0].${subGroupKey}[0].${commentKey}`, 'second comment'],
        ];

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

        return deepEqual(relevantEntries, expectedEntries) && deepEqual(req.previousValues, expectedPrevValues);
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

    // Ensure there are no more save requests in the queue afterwards
    cy.waitUntil(() => requests.filter((r) => !!r).length === 0);
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
