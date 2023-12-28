import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { v4 as uuid } from 'uuid';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IFormData } from 'src/features/formData';

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

  function interceptSaves() {
    cy.intercept('PUT', '**/instances/**/data/*', (req) => {
      const contentType = req.headers['content-type']?.toString();
      if (contentType.startsWith('multipart/form-data')) {
        const { dataModel, previousValues } = dirtyMultiPartParser(contentType, req.body);
        requests.push({
          id: uuid(),
          matched: false,
          dataModel,
          previousValues,
        });
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
        let val: any = dot.pick(key, req.dataModel);
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

  function expectNewRow(groupKey: string, index: number) {
    expectReq(
      (req) => {
        const actualRows = dot.pick(groupKey, req.dataModel);
        const actualLastIndex = actualRows.length - 1;
        const expectedPrevValues = {}; // There are no previous values for these saves
        return actualLastIndex === index && deepEqual(req.previousValues, expectedPrevValues);
      },
      `New row at ${groupKey}[${index}]`,
      `Failed to assert that adding new row occurred on group ${groupKey} at index ${index}`,
    );
  }

  it('Multipart saving with groups', () => {
    interceptSaves();
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();

    // Checking the checkbox should update with a 'null' previous value
    const root = 'Endringsmelding-grp-9786';
    const showGroupKey = `${root}.Avgiver-grp-9787.KontaktpersonEPost-datadef-27688.value`;
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    expectSave(showGroupKey, 'Ja', null);

    // And then unchecking it should do the inverse
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsUncheck();
    expectSave(showGroupKey, undefined, 'Ja');

    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    expectSave(showGroupKey, 'Ja', null);
    const groupKey = `${root}.OversiktOverEndringene-grp-9788`;
    const currentValueObj = 'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131';
    const currentValueKey = `${currentValueObj}.value`;
    const newValueObj = 'SkattemeldingEndringEtterFristNyttBelop-datadef-37132';
    const newValueKey = `${newValueObj}.value`;
    const subGroupKey = 'nested-grp-1234';
    const commentObj = 'SkattemeldingEndringEtterFristKommentar-datadef-37133';
    const commentKey = `${commentObj}.value`;

    function addRow(index: number, oldValue: string, newValue: string, comment) {
      cy.get(appFrontend.group.addNewItem).click();
      expectNewRow(groupKey, index);

      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.next).click();
      // openByDefault is true on the nested row
      expectNewRow(`${groupKey}[${index}].${subGroupKey}`, 0);
      expectSave(`${groupKey}[${index}].${subGroupKey}[0].source`, 'altinn', null);
      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.back).click();

      cy.get(appFrontend.group.currentValue).type(oldValue);
      expectSave(`${groupKey}[${index}].${currentValueKey}`, oldValue, null);

      cy.get(appFrontend.group.newValue).type(newValue);
      expectSave(`${groupKey}[${index}].${newValueKey}`, newValue, null);

      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.next).click();
      // Since we had 'openByDefault = true' on the nested row, it was opened automatically, but when we navigated
      // away from it and back, it should be closed again. It should be set as `openByDefault = first` if we wanted
      // it to be opened when navigating back to it.
      cy.get(appFrontend.group.row(index).nestedGroup.row(0).editBtn).click();
      cy.get(appFrontend.group.comments).type(comment);
      expectSave(`${groupKey}[${index}].${subGroupKey}[0].${commentKey}`, comment, null);

      cy.get(appFrontend.group.saveSubGroup).clickAndGone();
      cy.get(appFrontend.group.saveMainGroup).clickAndGone();
    }

    // Add some rows to the group
    addRow(0, '1', '2', 'first comment');
    addRow(1, '1234', '5678', 'second comment');

    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.newValue).type('2');
    expectSave(`${groupKey}[0].${newValueKey}`, '22', '2');
    cy.get(appFrontend.group.newValue).clear();
    cy.get(appFrontend.group.newValue).type('2');
    expectSave(`${groupKey}[0].${newValueKey}`, '2', '22');

    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.addNewItemSubGroup).click();
    expectNewRow(`${groupKey}[0].${subGroupKey}`, 1);
    expectSave(`${groupKey}[0].${subGroupKey}[1].source`, 'altinn', null);

    cy.get(appFrontend.group.comments).type('third comment in first row');
    expectSave(`${groupKey}[0].${subGroupKey}[1].${commentKey}`, 'third comment in first row', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedDynamics).dsCheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptionsToggle`, 'Ja', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).dsCheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, 'o111', null);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).dsCheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1'], ['o111']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[0]).dsCheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o111', 'o1', 'o11'], ['o111', 'o1']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[2]).dsUncheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o1', 'o11'], ['o111', 'o1', 'o11']);

    cy.get(appFrontend.group.row(0).nestedGroup.row(1).nestedOptions[1]).dsUncheck();
    expectSave(`${groupKey}[0].${subGroupKey}[1].extraOptions`, ['o11'], ['o1', 'o11']);

    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.group.row(0).deleteBtn).click();
    expectReq(
      (req) => {
        const actualRows = dot.pick(groupKey, req.dataModel);
        const expectedRows = [
          {
            [currentValueObj]: { value: '1234' },
            [newValueObj]: { value: '5678' },
            [subGroupKey]: [
              {
                source: 'altinn',
                [commentObj]: { value: 'second comment' },
              },
            ],
          },
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

        return deepEqual(actualRows, expectedRows) && deepEqual(req.previousValues, expectedPrevValues);
      },
      'first row deleted',
      'failed to assert first row deletion',
    );

    cy.get(appFrontend.group.row(0).deleteBtn).click();
    expectReq(
      (req) => {
        const actualRows = dot.pick(groupKey, req.dataModel);
        const expectedPrevValues = {
          [`${groupKey}[0].${currentValueKey}`]: '1234',
          [`${groupKey}[0].${newValueKey}`]: '5678',
          [`${groupKey}[0].${subGroupKey}[0].source`]: 'altinn',
          [`${groupKey}[0].${subGroupKey}[0].${commentKey}`]: 'second comment',
        };

        return deepEqual(actualRows, []) && deepEqual(req.previousValues, expectedPrevValues);
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
