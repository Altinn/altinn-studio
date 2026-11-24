import texts from 'test/e2e/fixtures/texts.json' with { type: 'json' };
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Datalist } from 'test/e2e/pageobjects/datalist';
import { expect, test } from 'test/e2e/playwright/extenders/testExtend';
import {
  clear,
  clickAfterScrollingToTop,
  clickAndGone,
  contains,
  getButtonByRole,
  jq,
  type,
} from 'test/e2e/playwright/helpers/actions';
import { exactText, expectToExist } from 'test/e2e/playwright/helpers/assertions';
import {
  dsReady,
  fillOutChangeName,
  fixturePath,
  numberFormatClear,
  numberFormatReplace,
} from 'test/e2e/playwright/helpers/form';
import { changeLayout, interceptLayout } from 'test/e2e/playwright/helpers/layout';
import { goto, gotoHiddenPage, gotoNavPage, navPage } from 'test/e2e/playwright/helpers/navigation';
import {
  intercept,
  interceptAltinnAppGlobalData,
  modifyJsonResponse,
  staticResponse,
} from 'test/e2e/playwright/helpers/network';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';
import { waitForLoad, waitUntilSaved } from 'test/e2e/playwright/helpers/waits';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { IDataModelMultiPatchResponse } from 'src/features/formData/types';
import type { BackendValidationIssue } from 'src/features/validation';

const appFrontend = new AppFrontend();
const dataListPage = new Datalist();

test.describe('Validation', () => {
  const newFirstName = /nytt fornavn/i;
  const newMiddleName = /nytt mellomnavn/i;
  const newLastName = /nytt etternavn/i;

  test('Required field validation should be visible on submit, not on blur', async ({ page }) => {
    await goto(page, 'changename');

    // This field has server-side validations marking it as required,
    // Since this component shows backend validations immediately, it should show up
    // TODO(Validation): Once it is possible to treat custom validations as required, this test should be updated
    const firstNameValidation = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName));
    await expect(firstNameValidation).toHaveText(exactText(texts.requiredFieldFromBackend));
    const firstNameInput = page.getByRole('textbox', { name: newFirstName });
    await type(firstNameInput, 'Per'); // Has to be less than 5 characters
    await firstNameInput.blur();
    await expect(firstNameValidation).toHaveCount(0);
    await clear(firstNameInput);

    const middleNameInput = page.getByRole('textbox', { name: newMiddleName });
    await type(middleNameInput, 'Some value');
    await middleNameInput.blur();
    await middleNameInput.focus();
    await clear(middleNameInput);
    await middleNameInput.blur();
    const middleNameValidation = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName));
    await expect(middleNameValidation).toHaveCount(0);

    await type(middleNameInput, 'Some middle name');

    await page.getByRole('checkbox', { name: /Ja[a-z, ]*/ }).check();
    await type(page.locator(appFrontend.changeOfName.reasonRelationship), 'test');
    await page.getByRole('button', { name: appFrontend.changeOfName.datePickerButton }).click();
    await page.locator('button[aria-label*="Today"]').click();
    await getButtonByRole(page, { name: /Neste/ }).click();

    await expect(firstNameValidation).toContainText(texts.requiredFieldFirstName);
    await expect(firstNameValidation).toContainText(texts.requiredFieldFromBackend);
    await expect(middleNameValidation).toHaveCount(0);
    await page.getByRole('tab', { name: /nytt etternavn/i }).click();
    await expect(page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName))).toHaveText(
      exactText(texts.requiredFieldLastName),
    );
  });

  test('Custom field validation - warning/info/success', async ({ page }) => {
    await goto(page, 'changename');
    await type(page.getByRole('textbox', { name: newFirstName }), 'test');

    // Error
    const firstNameValidation = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName));
    await expect(firstNameValidation).toHaveText(exactText(texts.testIsNotValidValue));
    await expect(firstNameValidation.locator('a[href="https://www.altinn.no/"]').first()).toBeAttached();

    const validationTypeMap = {
      warning: {
        value: 'test',
        message: texts.testIsNotValidValue,
      },
      info: {
        value: 'info',
        message: texts.infoMessage,
      },
      success: {
        value: 'success',
        message: texts.successMessage,
      },
    };

    const middleNameInput = page.getByRole('textbox', { name: newMiddleName });
    const middleNameValidation = page.locator(appFrontend.fieldValidation('newMiddleName'));
    for (const [type_, { value, message }] of Object.entries(validationTypeMap)) {
      const realType = type_ as keyof typeof validationTypeMap;
      await clear(middleNameInput);
      await type(middleNameInput, value);
      await expect(middleNameValidation).toContainText(message);

      // Should not have any other messages
      for (const [otherType, { message: otherMessage }] of Object.entries(validationTypeMap)) {
        if (otherType !== realType) {
          await expectToExist(middleNameValidation);
          await expect(middleNameValidation).not.toContainText(otherMessage);
        }
      }
    }

    // This error is about the middle name field, but is linked to the first name component. It should only show up
    // there, not on the middle name component that binds the field.
    await clear(middleNameInput);
    await type(middleNameInput, 'lenket');
    await expect(page.locator(appFrontend.fieldValidation('newFirstName'))).toContainText(texts.linkedToFirstName);
    // Checked once, like `{ timeout: 0 }` in Cypress. In Playwright, a timeout of 0 means no timeout.
    expect(await middleNameValidation.count()).toBe(0);

    await clear(middleNameInput);
    await expectToExist(page.locator(appFrontend.fieldValidation('newFirstName')));
    await expect(page.locator(appFrontend.fieldValidation('newFirstName'))).not.toContainText(texts.linkedToFirstName);
  });

  test('Page validation on clicking next', async ({ page }) => {
    await goto(page, 'changename');
    await clear(page.getByRole('textbox', { name: newFirstName }));
    await type(page.getByRole('textbox', { name: newFirstName }), 'test');
    await page
      .locator(appFrontend.changeOfName.confirmChangeName)
      .getByRole('checkbox', {
        name: /Ja[a-z, ]*/,
      })
      .check();
    await expect(await navPage(page, 'form')).toHaveAttribute('aria-current', 'page');
    await page.getByRole('tab', { name: newLastName }).click();
    // Cypress' .scrollIntoView() aligns the element with the top of the viewport
    await getButtonByRole(page, { name: /Neste/ }).evaluate((element) => element.scrollIntoView());
    await expect(getButtonByRole(page, { name: /Neste/ })).toBeEntirelyInViewport();
    await clickAfterScrollingToTop(getButtonByRole(page, { name: /Neste/ }));
    const errorReport = page.locator(appFrontend.errorReport);
    await expect(errorReport).toBeEntirelyInViewport();
    await expect(errorReport).toBeFocused();
    await expect(errorReport).toContainText(texts.errorReport);
    await expect(errorReport).toContainText(texts.requiredFieldLastName);
    await expect(errorReport).toContainText(texts.requiredFieldDateFrom);
    await expect(errorReport).toContainText(texts.next);
    await expect(await navPage(page, 'form')).toHaveAttribute('aria-current', 'page');
    await expect(errorReport.getByRole('listitem')).toHaveCount(4);
    await expect(errorReport.getByRole('button')).toHaveCount(4 + 2);
    const lastNameError = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName));
    await expectToExist(lastNameError);
    await expect(lastNameError).not.toBeEntirelyInViewport();
    await expectToExist(page.getByRole('textbox', { name: newLastName }));
    await expect(page.getByRole('textbox', { name: newLastName })).not.toBeFocused();

    const lastNameErrorButton = jq(page, `button:contains("${texts.requiredFieldLastName}")`);
    await expect(lastNameErrorButton).toBeEntirelyInViewport();
    await clickAfterScrollingToTop(lastNameErrorButton);

    // Observe that we scrolled to show the error message and have the field focussed
    await expect(lastNameError).toBeEntirelyInViewport();
    await expect(page.locator(appFrontend.changeOfName.newLastName)).toBeFocused();

    // Go to the summary page
    await gotoNavPage(page, 'summary');
    await expect(errorReport).toContainText(texts.errorReport);
    await expect(errorReport).toContainText(texts.requiredFieldLastName);
    await expect(errorReport).toContainText(texts.requiredFieldDateFrom);
    await expect(errorReport).not.toBeFocused();
    await expect(lastNameError).toHaveCount(0);

    // Click the error text, which should lead us back to the change name form and focus the field
    await jq(page, `button:contains("${texts.requiredFieldLastName}")`).click();

    await expectToExist(lastNameError);
    await expect(lastNameError).toBeEntirelyInViewport();
    await expect(page.locator(appFrontend.changeOfName.newLastName)).toBeFocused();
  });

  test('Validation on uploaded attachment type', async ({ page }) => {
    await goto(page, 'changename');
    await page.locator(appFrontend.changeOfName.upload).setInputFiles(fixturePath('test.png'));
    await expect(page.getByRole('alert', { name: /test.png/ })).toContainText(texts.attachmentError);
    await page
      .getByRole('alert', { name: /test.png/ })
      .getByRole('button')
      .click();
    await expect(page.getByRole('alert', { name: /test.png/ })).toHaveCount(0);
  });

  test('Validation on uploaded attachment type with tag', async ({ page }) => {
    const upload = await intercept(page, { method: 'POST', url: '**/instances/**/data/*' });
    await goto(page, 'changename');
    await page.locator(appFrontend.changeOfName.uploadWithTag.uploadZone).setInputFiles(fixturePath('test.pdf'));
    await upload.wait();
    await dsReady(page, appFrontend.changeOfName.uploadWithTag.saveTag);
    await page.locator(appFrontend.changeOfName.uploadWithTag.saveTag).click();
    await expectToExist(page.locator(appFrontend.changeOfName.uploadWithTag.editWindow));
    await expect(page.locator(appFrontend.changeOfName.uploadWithTag.editWindow)).not.toContainText(
      appFrontend.changeOfName.uploadWithTag.unwantedChar,
    );
    await gotoNavPage(page, 'grid');
    await page.locator(appFrontend.sendinButton).click();
    await expectToExist(page.locator(appFrontend.errorReport));
    await expect(page.locator(appFrontend.errorReport)).not.toContainText(
      appFrontend.changeOfName.uploadWithTag.unwantedChar,
    );
  });

  test('Client side validation from json schema', async ({ page }) => {
    await goto(page, 'changename');
    await type(page.locator(appFrontend.changeOfName.newFirstName), 'a');

    // Tests regex validation in schema
    await page.getByRole('tab', { name: newLastName }).click();
    await type(page.locator(appFrontend.changeOfName.newLastName), 'client');
    await expect(page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName))).toHaveText(
      exactText(texts.clientSide),
    );
    await clear(page.locator(appFrontend.changeOfName.newLastName));

    // Tests max length validation in schema
    await page.getByRole('tab', { name: newMiddleName }).click();
    await type(
      page.locator(appFrontend.changeOfName.newMiddleName),
      'very long middle name that is over 50 characters which is the limit',
    );
    await expect(page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName))).toContainText(
      texts.clientSide,
    );

    // Hiding the field should remove the validation
    await page.getByRole('tab', { name: newLastName }).click();
    await type(page.locator(appFrontend.changeOfName.newLastName), 'hideNext');
    await page.getByRole('tab', { name: newMiddleName }).click();
    await expect(page.locator(appFrontend.changeOfName.newMiddleName)).toBeAttached();
    await changeLayout(page, (component) => {
      if (component.id === 'newMiddleName') {
        component.hidden = ['equals', ['component', 'newLastName'], 'hideNext'];
      }
    });
    await expect(page.getByRole('textbox', { name: newMiddleName })).toHaveCount(0);
    await expect(page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName))).toHaveCount(0);

    const expectedErrors = [
      {
        text: 'Må summeres opp til 100%',
        elementIdToFocus: 'fordeling-total',
      },
      {
        text: 'Bruk 60 eller færre tegn',
        elementIdToFocus: 'changeNameTo',
      },
      {
        text: 'Du må fylle ut dato for navneendring',
        elementIdToFocus: 'dateOfEffect',
      },
      {
        text: 'Du må fylle ut bekreftelse av navn',
        elementIdToFocus: 'confirmChangeName',
      },
    ];

    // Clicking the submit button should display all validation errors on the bottom, and clicking them
    // should move focus to the correct elements in the form.
    await gotoNavPage(page, 'grid');
    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport).locator('li')).toHaveCount(expectedErrors.length);
    for (const { text, elementIdToFocus } of expectedErrors) {
      await expect(page.locator(appFrontend.errorReport)).toContainText(text);
      await jq(page, `button:contains("${text}")`).click();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.activeElement?.closest('[data-componentid]')?.getAttribute('data-componentid') ?? null,
          ),
        )
        .toBe(elementIdToFocus);
    }
  });

  test('Task validation', async ({ page }) => {
    await intercept(page, { url: '**/active' }, staticResponse({ body: [] }));

    await intercept(
      page,
      { method: 'PUT', url: '**/process/next*', times: 1 },
      staticResponse({
        statusCode: 409,
        body: {
          validationIssues: [
            {
              severity: 1,
              code: 'error',
              description: 'task validation',
            },
          ],
        },
      }),
    );

    await startAppInstance(page, appFrontend.apps.frontendTest);
    await waitForLoad(page);
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);
    await page.locator(appFrontend.sendinButton).click(); // Should fail the first time due to validation
    await expect(page.locator(appFrontend.errorReport)).toContainText('task validation');
    await page.locator(appFrontend.sendinButton).click(); // Second time should succeed
    await expect(page.locator(appFrontend.changeOfName.currentName)).toBeVisible();
  });

  test('Validations are removed for hidden fields', async ({ page }) => {
    // Init and add data to group
    await goto(page, 'group');
    await getButtonByRole(page, { name: /Neste/ }).click();
    await page
      .locator(appFrontend.group.showGroupToContinue)
      .getByRole('checkbox', { name: 'Ja', exact: true })
      .check();
    await page.locator(appFrontend.group.addNewItem).click();
    await type(page.locator(appFrontend.group.currentValue), '123');
    await type(page.locator(appFrontend.group.newValue), '321');

    // Create validation error
    await jq(
      page.locator(appFrontend.group.mainGroup).locator(appFrontend.group.editContainer),
      appFrontend.group.next,
    ).click();

    // This error has no field, but is linked to a component in the nested row
    await type(page.locator(appFrontend.group.comments), 'lenket');
    await expect(page.locator(appFrontend.fieldValidation('hideComment-0-0'))).toHaveText(exactText(texts.linkedToRow));
    // Checked once, like `{ timeout: 0 }` in Cypress
    expect(await page.locator(appFrontend.fieldValidation('comments-0-0')).count()).toBe(0);
    await clear(page.locator(appFrontend.group.comments));
    await expect(page.locator(appFrontend.fieldValidation('hideComment-0-0'))).toHaveCount(0);

    await type(page.locator(appFrontend.group.comments), 'test');
    await expect(page.locator(appFrontend.fieldValidation('comments-0-0'))).toHaveText(
      exactText(texts.testIsNotValidValue),
    );
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);

    // Hide field that contains validation error and verify validation messages are gone
    await page.locator(appFrontend.group.hideCommentField).getByRole('checkbox', { name: 'Ja', exact: true }).check();
    await expect(page.locator(appFrontend.group.comments)).toHaveCount(0);
    await expect(page.locator(appFrontend.fieldValidation('comments-0-0'))).toHaveCount(0);
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);

    await changeLayout(page, (component) => {
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
      if (component.id === 'sendersName' && component.type === 'Input') {
        // Make sure changing this field triggers single field validation
        component.showValidations = ['AllExceptRequired'];
      }
    });

    // Verify that validation message is shown, but also make sure only one error message is shown
    // (there is a hidden layout that also binds to the same location, and a bug caused it to show
    // up twice because of that component on the hidden layout)
    await gotoNavPage(page, 'hide');
    await type(page.locator(appFrontend.group.sendersName), 'tull og tøys');

    // Try to click next to observe the error report
    await getButtonByRole(page, { name: /Neste/ }).click();
    const errorReport = page.locator(appFrontend.errorReport);
    await expect(errorReport).toContainText('Tullevalidering');
    await expect(errorReport).toBeFocused();
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);

    // The navigation should be stopped, so we should still be on the 'hide' page
    await expect(await navPage(page, 'hide')).toHaveAttribute('aria-current', 'page');
  });

  test('List component: validation messages should only show up once', async ({ page }) => {
    await goto(page, 'datalist');
    await expect(page.locator(dataListPage.tableBody).first()).toContainText('Caroline');
    // The error report is only entirely inside the viewport if the click scrolls the page first, the way Cypress does
    await clickAfterScrollingToTop(getButtonByRole(page, { name: /neste/i }).nth(1));
    const errorReport = page.locator(appFrontend.errorReport);
    await expect(errorReport).toBeEntirelyInViewport();
    await expect(errorReport).toContainText(texts.errorReport);
    await expect(errorReport).toContainText(texts.next);
    await expect(jq(errorReport, 'li:contains("Du må fylle ut hvem gjelder saken?")')).toHaveCount(1);
  });

  test('Clicking the error report should focus the correct field', async ({ page }) => {
    await interceptLayout(page, 'Task_3', (component) => {
      if (
        (component.id === 'comments' || component.id === 'newValue' || component.id === 'currentValue') &&
        (component.type === 'Input' || component.type === 'TextArea')
      ) {
        component.required = true;
      }
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.validateOnSaveRow = ['All'];
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });
    await goto(page, 'group');

    const errorReport = page.locator(appFrontend.errorReport);
    const editContainer = page.locator(appFrontend.group.editContainer);
    await page.getByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    await page.getByRole('checkbox', { name: appFrontend.group.prefill.stor }).check();
    await clickAndGone(getButtonByRole(page, { name: /Neste/ }));
    await expect(await navPage(page, 'repeating')).toHaveAttribute('aria-current', 'page');

    // Check that showGroupToContinue can be focused when clicked
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(await navPage(page, 'repeating')).toHaveAttribute('aria-current', 'page');

    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await errorReport.getByText(texts.requiredOpenRepGroup, { exact: true }).click();
    await expect(page.locator(appFrontend.group.showGroupToContinue).locator('input')).toBeFocused();

    // Check that clicking the error focuses a component inside a group
    await page
      .locator(appFrontend.group.showGroupToContinue)
      .getByRole('checkbox', { name: 'Ja', exact: true })
      .check();
    await page.locator(appFrontend.group.addNewItem).click();
    await jq(editContainer, appFrontend.group.next).click();
    await expect(page.locator(appFrontend.group.row(2).nestedGroup.row(0).comments)).toBeVisible();
    await page.locator(appFrontend.group.saveMainGroup).click();
    // The nested group's edit container is open too. Cypress' be.visible checks the first element it finds.
    await expect(editContainer.first()).toBeVisible();
    await expect(errorReport).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(3);
    await errorReport.getByText('Du må fylle ut 1. endre fra', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toBeFocused();
    await type(page.locator(appFrontend.group.row(2).currentValue), '123');

    await errorReport.getByText('Du må fylle ut 2. endre verdi 123 til', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).newValue)).toBeFocused();
    await page.locator(appFrontend.group.saveMainGroup).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(2);

    // Validation message should now have changed, since we filled out currentValue and saved
    await expect(errorReport.getByText('Du må fylle ut 2. endre verdi 123 til', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Slett NOK 123', exact: true }).click();
    await expect(page.locator(appFrontend.group.mainGroupTableBody).locator('tr')).toHaveCount(2);

    // Check that nested group with multipage gets focus
    await page.getByRole('button', { name: 'Se innhold NOK 1', exact: true }).click();
    await jq(editContainer, appFrontend.group.next).click();
    await type(page.locator(appFrontend.group.row(0).nestedGroup.row(0).comments), 'comment');
    await page.locator(appFrontend.group.saveSubGroup).click();
    await page.locator(appFrontend.group.addNewItemSubGroup).click();
    await expect(page.locator(appFrontend.group.row(0).nestedGroup.row(1).comments)).toBeVisible();
    await page.locator(appFrontend.group.saveSubGroup).click();
    await expect(errorReport).toHaveCount(0);
    await expect(page.getByText(texts.requiredComment, { exact: true })).toBeAttached();
    await gotoNavPage(page, 'prefill');
    await expect(page.getByRole('checkbox', { name: appFrontend.group.prefill.liten })).toBeVisible();
    await gotoNavPage(page, 'repeating');
    await expect(errorReport).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await page.getByRole('button', { name: 'Se innhold NOK 1 233', exact: true }).click();
    await errorReport.getByText(texts.requiredComment, { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(0).nestedGroup.row(1).comments)).toBeFocused();

    // Check that switching page works
    await type(page.locator(appFrontend.group.row(0).nestedGroup.row(1).comments), 'comment2');
    await page.getByRole('button', { name: 'Lukk NOK 1', exact: true }).click();
    await gotoNavPage(page, 'summary');
    await page.locator(appFrontend.sendinButton).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await errorReport.getByText(texts.requiredSendersName, { exact: true }).click();
    await expect(page.locator(appFrontend.group.sendersName)).toBeFocused();
    await type(page.locator(appFrontend.group.sendersName), 'hello world');
    await expect(errorReport).toHaveCount(0);
    await page.getByRole('button', { name: 'Forrige', exact: true }).click();
    await expect(await navPage(page, 'Kjæledyr')).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Forrige', exact: true }).click();

    await changeLayout(page, (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup' && component.tableColumns) {
        // As the component is hidden in edit mode, and not shown in the table for editing, it should not be
        // showing any validation messages.
        component.tableColumns.currentValue.showInExpandedEdit = false;
      }
    });

    // Attempting to save the group with one remaining required field should let us focus that field,
    // but the field not shown in the expanded edit should not be focused
    await page.locator(appFrontend.group.addNewItem).click();
    await page.locator(appFrontend.group.saveMainGroup).click();

    // The currentValue field is required, but as it's implicitly hidden in the expanded edit, it should not produce
    // a validation message or be visible in the error report.
    await getButtonByRole(page.locator(appFrontend.navButtons), { name: /Neste/ }).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await expect(editContainer.first()).toBeVisible();
    await errorReport.getByText('Du må fylle ut 2. endre verdi til', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).newValue)).toBeFocused();
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toHaveCount(0);

    // Even though the currentValue field is hidden, the value should still be displayed in the table
    const tableRows = page.locator(appFrontend.group.mainGroupTableBody).locator('tr');
    await expect(tableRows.nth(0).locator('td').nth(0)).toHaveText(exactText('NOK 1'));
    await expect(tableRows.nth(1).locator('td').nth(0)).toHaveText(exactText('NOK 1 233'));

    // Filling out the remaining field should let us save the group and hide leftover errors
    await type(page.locator(appFrontend.group.row(2).newValue), '456');
    await waitUntilSaved(page);
    await page.locator(appFrontend.group.saveMainGroup).click();
    await expect(editContainer).toHaveCount(0);
    await expect(errorReport).toHaveCount(0);

    await changeLayout(page, (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup' && component.edit) {
        // In the 'onlyTable' mode, there is no option to edit a row, so we should not open the row in edit mode
        // to focus a component either.
        component.edit.mode = 'onlyTable';
      }
    });

    // These components are not editable in the table yet, so even though the edit button
    // is gone now, they're not to be found.
    await expect(page.getByRole('button', { name: /Rediger/ })).toHaveCount(0);
    await expect(page.locator(appFrontend.group.row(0).currentValue)).toHaveCount(0);
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toHaveCount(0);
    await expect(page.locator(appFrontend.group.row(0).newValue)).toHaveCount(0);
    await expect(editContainer).toHaveCount(0);

    await changeLayout(page, (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup' && component.tableColumns) {
        component.tableColumns.currentValue.editInTable = undefined;
        component.tableColumns.newValue.editInTable = true;
      }
      if (component.type === 'NavigationButtons') {
        // When components are visible in the table, the validation trigger on the group itself stops having an effect,
        // as there is no way for the user to say they're 'done' editing a row.
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });

    // Components are now visible in the table. Cypress checks `have.attr', 'readonly', 'readonly'` with jQuery, which
    // returns the attribute's name for any boolean attribute that is present. React renders readonly="".
    await expect(page.locator(appFrontend.group.row(0).currentValue)).toHaveAttribute('readonly');
    await expectToExist(page.locator(appFrontend.group.row(2).currentValue));
    await expect(page.locator(appFrontend.group.row(2).currentValue)).not.toHaveAttribute('readonly');
    await expect(page.locator(appFrontend.group.row(0).newValue)).toHaveAttribute('readonly');

    // Delete the row, start over, and observe that the currentValue now exists as a field in the table and
    // produces a validation message if not filled out. We need to use the 'next' button to trigger validation.
    await page.getByRole('button', { name: 'Slett NOK 456', exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toHaveCount(0);
    await page.locator(appFrontend.group.addNewItem).click();
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toBeAttached();
    await expect(page.locator(appFrontend.group.row(2).newValue)).toBeAttached();
    await expect(editContainer).toHaveCount(0);
    await expect(errorReport).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(await navPage(page, 'repeating')).toHaveAttribute('aria-current', 'page');
    await expect(errorReport.getByRole('listitem')).toHaveCount(2);
    await errorReport.getByText('Du må fylle ut 1. endre fra', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toBeFocused();
    await expect(editContainer).toHaveCount(0);
    await errorReport.getByText('Du må fylle ut 2. endre verdi til', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).newValue)).toBeFocused();
    await expect(editContainer).toHaveCount(0);

    await changeLayout(page, (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup' && component.tableColumns) {
        // Components with editInTable: false in onlyTable mode are shown as read-only cells are still visible and validated.
        component.tableColumns.currentValue.editInTable = false;
      }
    });

    await expect(page.locator(appFrontend.group.row(0).currentValue)).toHaveCount(0);
    await expect(page.locator(appFrontend.group.row(0).newValue)).toBeAttached();
    await expect(tableRows.nth(1).locator('td').nth(0)).toHaveText(exactText('NOK 1 233'));
    await expect(tableRows.nth(2).locator('td').nth(0)).toHaveText(exactText(''));
    await expect(page.locator(appFrontend.group.row(2).currentValue)).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(await navPage(page, 'repeating')).toHaveAttribute('aria-current', 'page');
    await expect(errorReport.getByRole('listitem')).toHaveCount(2);
    await errorReport.getByText('Du må fylle ut 2. endre verdi til', { exact: true }).click();
    await expect(page.locator(appFrontend.group.row(2).newValue)).toBeFocused();

    await changeLayout(page, (component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        component.edit &&
        component.tableColumns
      ) {
        // In regular mode, if the edit button is hidden, we should not open the row in edit mode to focus a component
        // because this isn't a mode the user would be able to reach either.
        component.edit.mode = 'showTable';
        component.edit.editButton = false;
        component.tableColumns.newValue.editInTable = undefined;
        component.tableColumns.currentValue.editInTable = undefined;
      }
    });

    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await expect(editContainer).toHaveCount(0);
    await page.locator(appFrontend.group.addNewItem).click();
    await expect(page.locator(appFrontend.group.row(3).newValue)).toHaveCount(0);
    await expect(page.locator(appFrontend.group.row(3).currentValue)).toHaveCount(0);
    await expect(editContainer).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();

    // The validations still show up, because technically these are not hidden, but they're unreachable.
    // See the TODO in RepeatingGroup/index.tsx for why fixing this is a breaking change.
    await expect(errorReport.getByRole('listitem')).toHaveCount(2);
    await expect(await navPage(page, 'repeating')).toHaveAttribute('aria-current', 'page');
  });

  test('Validates mime type on attachment', async ({ page }) => {
    await goto(page, 'changename');

    const upload = page.locator(appFrontend.changeOfName.upload);
    const uploadedTable = page.locator(appFrontend.changeOfName.uploadedTable);
    await upload.setInputFiles(fixturePath('test.pdf'));

    await expect(uploadedTable).toBeVisible();
    await expect(
      uploadedTable.locator('tbody > tr').nth(0).locator(appFrontend.changeOfName.fileUploadSuccess).first(),
    ).toBeAttached();

    await upload.setInputFiles(fixturePath('test.png'));
    await expect(page.getByRole('alert', { name: /test.png/ })).toContainText(texts.invalidFileExtension);
    await expect(uploadedTable.locator('tbody > tr')).toHaveCount(1);

    await upload.setInputFiles(fixturePath('test-invalid.pdf'));
    await expect(page.getByRole('alert', { name: /test-invalid.pdf/ })).toContainText(texts.invalidMimeType);
    await expect(uploadedTable.locator('tbody > tr')).toHaveCount(1);

    await page
      .getByRole('alert', { name: /test.png/ })
      .getByRole('button')
      .click();
    await page
      .getByRole('alert', { name: /test-invalid.pdf/ })
      .getByRole('button')
      .click();

    await expect(page.getByRole('alert', { name: /test.png/ })).toHaveCount(0);
    await expect(page.getByRole('alert', { name: /test-invalid.pdf/ })).toHaveCount(0);
  });

  test('Submitting should be rejected if validation fails on field hidden by pageOrderConfig', async ({ page }) => {
    await goto(page, 'changename');
    await fillOutChangeName(page);

    await numberFormatClear(page.locator(appFrontend.grid.bolig.percent));

    await numberFormatClear(page.locator(appFrontend.grid.kredittkort.percent));
    await type(page.locator(appFrontend.grid.kredittkort.percent), '{moveToStart}{del}44');

    await numberFormatClear(page.locator(appFrontend.grid.studie.percent));
    await type(page.locator(appFrontend.grid.studie.percent), '{moveToStart}{del}56');

    // When filling out the credit card field with 44%, there is a special validation that triggers and is added to
    // a field on a hidden page. Even though this should not happen, we should still not be able to continue, as
    // submitting the form now when there is a validation error should not be possible - and attempting it will cause
    // the dreaded 'unknown error' message to appear.
    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport)).toContainText('Valideringsmelding på felt som aldri vises');
    await expect(await navPage(page, 'grid')).toHaveAttribute('aria-current', 'page');
  });

  test('Submitting should be rejected if validation fails on field hidden using expression', async ({ page }) => {
    await interceptLayout(page, 'Task_3', (c) => {
      if (c.type === 'Input' && c.id === 'sendersName') {
        c.hidden = ['equals', ['component', 'hideRepeatingGroupRow'], 748];
      }
    });

    await goto(page, 'group');
    await expect(page.locator(appFrontend.navMenuButtons)).toHaveCount(5);

    await gotoNavPage(page, 'hide');
    await type(page.locator(appFrontend.group.sendersName), 'tull og tøys'); // Causes validation error

    await gotoNavPage(page, 'repeating');
    await page
      .locator(appFrontend.group.showGroupToContinue)
      .getByRole('checkbox', { name: 'Ja', exact: true })
      .check();
    await numberFormatReplace(page.locator(appFrontend.group.hideRepeatingGroupRow), '748');
    await expect(page.locator(appFrontend.group.hideRepeatingGroupRow)).toHaveValue('NOK 748');
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(await navPage(page, 'Kjæledyr')).toHaveAttribute('aria-current', 'page');
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(page.locator(appFrontend.navMenuButtons)).toHaveCount(5); // 'hide' page is still visible
    await expect(await navPage(page, 'hide')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(appFrontend.group.sendersName)).toHaveCount(0);
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);

    await gotoNavPage(page, 'summary');
    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport)).toContainText('Tullevalidering');
  });

  test('Submitting should be rejected if validation fails on page hidden using expression', async ({ page }) => {
    await interceptLayout(
      page,
      'Task_3',
      () => undefined,
      (layoutSet) => {
        layoutSet.hide.data.hidden = ['equals', ['component', 'hideRepeatingGroupRow'], 749];
      },
    );

    await goto(page, 'group');
    await expect(page.locator(appFrontend.navMenuButtons)).toHaveCount(5);

    await gotoNavPage(page, 'hide');
    await type(page.locator(appFrontend.group.sendersName), 'tull og tøys'); // Causes validation error

    await gotoNavPage(page, 'repeating');
    await page
      .locator(appFrontend.group.showGroupToContinue)
      .getByRole('checkbox', { name: 'Ja', exact: true })
      .check();
    await numberFormatReplace(page.locator(appFrontend.group.hideRepeatingGroupRow), '749');
    await expect(page.locator(appFrontend.group.hideRepeatingGroupRow)).toHaveValue('NOK 749');
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(await navPage(page, 'Kjæledyr')).toHaveAttribute('aria-current', 'page');
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(page.locator(appFrontend.navMenuButtons)).toHaveCount(4); // 'hide' page is now invisible
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);
    await expect(await navPage(page, 'summary')).toHaveAttribute('aria-current', 'page');

    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport)).toContainText('Tullevalidering');
  });

  test('Navigating to one task and navigating back should not produce error messages for hidden pages', async ({
    page,
  }) => {
    await goto(page, 'group');
    await gotoNavPage(page, 'summary');
    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport).getByRole('listitem')).toHaveCount(2);

    await page.goto(page.url().replace('Task_3', 'Task_5'));

    await expect(page).toHaveURL((url) => url.href.endsWith('/Task_5/summary'));
    await expect(page.getByRole('button', { name: /gå til riktig prosessteg/i })).toBeVisible();

    await page.goto(page.url().replace('Task_5', 'Task_3'));

    await expect(page).toHaveURL((url) => url.href.endsWith('/Task_3/summary'));

    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport).getByRole('listitem')).toHaveCount(2);
  });

  test('should navigate and scroll to correct component when clicking error report', async ({ page }) => {
    await goto(page, 'changename');
    await gotoNavPage(page, 'grid');
    await page.locator(appFrontend.sendinButton).click();
    await expect(page.locator(appFrontend.errorReport).getByRole('listitem')).toHaveCount(6);
    await page.getByText('Du må fylle ut dato for navneendring', { exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: /når vil du at navnendringen skal skje\?\s*må fylles ut/i }),
    ).toBeVisible();
  });

  test('should validate boolean fields as set in the data model even when they are set to false', async ({ page }) => {
    await interceptLayout(page, 'Task_1', (component) => {
      if (component.id === 'falsyRadioButton') {
        component.hidden = false;
      }
    });
    await goto(page, 'message');

    await page.getByRole('radio', { name: 'False', exact: true }).click();
    await page.getByRole('button', { name: 'Send inn', exact: true }).click();

    // content from next page
    await expect(page.getByText('Nåværende navn', { exact: true })).toBeAttached();
  });

  test('should validate number fields as set in the data model when a falsy value is input', async ({ page }) => {
    await interceptLayout(page, 'Task_1', (component) => {
      if (component.id === 'falsyInput') {
        component.hidden = false;
      }
    });
    await goto(page, 'message');

    await type(page.getByRole('textbox', { name: 'Input with falsy value', exact: true }), '0');
    await page.getByRole('button', { name: 'Send inn', exact: true }).click();

    // Content from next page
    await expect(page.getByText('Nåværende navn', { exact: true })).toBeAttached();
  });

  test('Should navigate and focus correct row in Likert component when clicking on error report', async ({ page }) => {
    await goto(page, 'likert');
    await page.getByRole('button', { name: /Send inn/ }).click();

    const row = page.getByRole('row', {
      name: /Hører skolen på elevenes forslag\?\s*må fylles ut/i,
    });
    await expectToExist(row.getByRole('radio', { name: /Alltid/ }));
    await expect(row.getByRole('radio', { name: /Alltid/ })).not.toBeFocused();

    await page.getByRole('button', { name: /Du må fylle ut hører skolen på elevenes forslag/ }).click();

    await expect(row.getByRole('radio', { name: /Alltid/ })).toBeFocused();
  });

  test('Existing validations should not disappear when a backend validator is not executed', async ({ page }) => {
    await goto(page, 'changename');
    await type(page.getByRole('textbox', { name: newFirstName }), 'test');
    const firstNameValidation = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName));
    await expect(firstNameValidation).toHaveText(exactText(texts.testIsNotValidValue));

    const patchData = await intercept(
      page,
      { method: 'PATCH', url: '**/data?language=*' },
      modifyJsonResponse<IDataModelMultiPatchResponse>((body) => ({
        ...body,
        validationIssues: [],
      })),
    );

    await type(page.locator(appFrontend.changeOfName.newMiddleName), 'hei');
    await patchData.wait();

    await expect(firstNameValidation).toHaveText(exactText(texts.testIsNotValidValue));
  });

  test('Datepicker should show component validation instead of format error from schema', async ({ page }) => {
    await interceptLayout(page, 'Task_2', (component) => {
      if (component.type === 'Datepicker' && component.id === 'dateOfEffect') {
        component.showValidations = ['AllExceptRequired'];
      }
    });

    await goto(page, 'changename');
    await waitForLoad(page);

    const patchData = await intercept(page, { method: 'PATCH', url: '**/data?language=*' });

    const dateOfEffect = page.locator(appFrontend.changeOfName.dateOfEffect);
    await type(dateOfEffect, '01/01/2020');
    await dateOfEffect.blur();
    await patchData.wait();
    expect(patchData.requests.length).toBe(1);

    const dateValidation = page.locator(appFrontend.fieldValidation(appFrontend.changeOfName.dateOfEffect));
    await expect(dateValidation).toHaveCount(0);

    await clear(dateOfEffect);
    await type(dateOfEffect, '45/45/1234');
    await dateOfEffect.blur();
    await patchData.wait();
    expect(patchData.requests.length).toBe(2);

    await expect(dateValidation).toContainText('Ugyldig datoformat');
    await expectToExist(dateValidation);
    await expect(dateValidation).not.toContainText('Feil format');
  });

  test('should not show required validation when data is invalid and not saveable', async ({ page }) => {
    await interceptLayout(page, 'Task_2', (component) => {
      if (component.type === 'Input' && component.id === 'int32AsNumber') {
        component.showValidations = ['All'];
        component.required = true;
      }
    });

    await gotoHiddenPage(page, 'numeric-fields');

    const validation = page.locator(appFrontend.fieldValidation('int32AsNumber'));
    await expect(validation).toContainText('Du må fylle ut int32');

    await type(page.getByRole('textbox', { name: /int32.*/i }), '999999999999999');
    await expect(validation).toContainText('Feil format eller verdi');
    await expectToExist(validation);
    await expect(validation).not.toContainText('Du må fylle ut int32');
  });

  test('deep validations should work, but should not include errors in the repeating group', async ({ page }) => {
    const requiredInputs = ['comments', 'currentValue', 'newValue'];
    await interceptLayout(page, 'Task_3', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.minCount = 2;
        component.maxCount = 4;
        component.validateOnSaveRow = ['All'];
      }
      if (component.type === 'Input' && requiredInputs.includes(component.id)) {
        component.required = true;
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });

    await goto(page, 'group');
    await gotoNavPage(page, 'repeating');
    await page
      .locator(appFrontend.group.showGroupToContinue)
      .getByRole('checkbox', { name: 'Ja', exact: true })
      .check();
    await page.locator(appFrontend.group.addNewItem).click();

    const errorReport = page.locator(appFrontend.errorReport);
    const editContainer = page.locator(appFrontend.group.editContainer);

    // Try to close the row, but find out we're not allowed (as there are 2 required fields currently)
    await page.locator(appFrontend.group.saveMainGroup).click();
    await expect(editContainer.first()).toBeVisible();
    await expect(page.locator(appFrontend.group.currentValue)).toBeVisible();
    await expect(page.locator(appFrontend.group.newValue)).toBeVisible();
    await expect(errorReport).toHaveCount(0);
    await getButtonByRole(page.locator(appFrontend.navButtons), { name: /Neste/ }).click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(3);
    await expect(errorReport).toContainText('Du må fylle ut 1. endre fra');
    await expect(errorReport).toContainText('Du må fylle ut 2. endre verdi til');
    await expect(errorReport).toContainText('Minst 2 rader er påkrevd');

    // Filling those out will allow us to close the row
    await type(page.locator(appFrontend.group.currentValue), '123');
    await type(page.locator(appFrontend.group.newValue), '321');
    await page.locator(appFrontend.group.saveMainGroup).click();
    await expect(editContainer).toHaveCount(0);

    // Navigating to the next page is not allowed, we need at least 2 rows
    await contains(page.locator(appFrontend.navButtons), 'button', 'Neste').click();
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await expect(errorReport).toContainText('Minst 2 rader er påkrevd');

    // Add one more row, this time navigating to the next page inside it to openByDefault a new row in the nested group
    await page.locator(appFrontend.group.addNewItem).click();
    // The failed page navigation above intentionally keeps the page validation mask active. Adding a row resolves
    // minCount, but the same mask should keep revealing new required errors on the page. This is a change in v9,
    // previously only older/existing errors would show up in the error report, new ones that appeared after the error
    // report was triggered would not appear yet.
    await expect(errorReport.getByRole('listitem')).toHaveCount(2);
    await expect(errorReport).toContainText('Du må fylle ut 1. endre fra');
    await expect(errorReport).toContainText('Du må fylle ut 2. endre verdi til');
    await type(page.locator(appFrontend.group.currentValue), '1234');
    await type(page.locator(appFrontend.group.newValue), '4321');
    await jq(editContainer, appFrontend.group.next).click();
    await expect(page.locator(appFrontend.group.comments)).toBeVisible(); // Required field in the nested group
    // The page validation mask also applies to the nested group row now that its required field is visible,
    // and the main group row reports deep validations for its descendants.
    await expect(page.locator(appFrontend.group.row(1).nestedGroup.row(0).tableRow)).toContainText('Rett feil her');
    await expect(page.locator(appFrontend.group.row(1).tableRow)).toContainText('Rett feil her');
    await page.locator(appFrontend.group.saveMainGroup).click({ force: true });
    await expect(page.locator(appFrontend.group.row(1).nestedGroup.row(0).tableRow)).toContainText('Rett feil her');
    await expect(page.locator(appFrontend.group.row(1).tableRow)).toContainText('Rett feil her');
    await expect(errorReport.getByRole('listitem')).toHaveCount(1);
    await expect(errorReport).toContainText('Du må fylle ut kommentar');

    // Forcing us away from the 'repeating' page should reset the open-state in the repeating group, but not the errors
    await gotoNavPage(page, 'prefill');
    await expect(page.getByRole('checkbox', { name: appFrontend.group.prefill.liten })).toBeVisible();
    await gotoNavPage(page, 'repeating');
    await expect(page.locator(appFrontend.group.row(1).tableRow)).toContainText('Rett feil her');
    await page.locator(appFrontend.group.row(1).editBtn).click();
    await jq(editContainer, appFrontend.group.next).click();
    await expect(page.locator(appFrontend.group.row(1).nestedGroup.row(0).tableRow)).toContainText('Rett feil her');

    // Filling out the comment fixes the problem and lets us navigate to the next page
    await page.locator(appFrontend.group.row(1).nestedGroup.row(0).editBtn).click();
    await type(page.locator(appFrontend.group.comments), 'hello world');
    await page.locator(appFrontend.group.saveMainGroup).click();
    await expectToExist(page.locator(appFrontend.group.row(1).tableRow));
    await expect(page.locator(appFrontend.group.row(1).tableRow)).not.toContainText('Rett feil her');
    await expect(errorReport).toHaveCount(0);
    await expect(editContainer).toHaveCount(0);
    await contains(page.locator(appFrontend.navButtons), 'button', 'Neste').click();

    // We're on the next page! Yay
    await expect(await navPage(page, 'Kjæledyr')).toHaveAttribute('aria-current', 'page');
  });

  test('should display backend validation message with customTextKey and customTextParameters correctly', async ({
    page,
  }) => {
    await interceptAltinnAppGlobalData(page, (globalData) => {
      globalData.textResources?.resources.push({
        id: 'custom_error_too_long',
        value: 'Verdien kan ikke være lengre enn {0}, den er nå {1}',
        variables: [
          {
            key: 'max_length',
            dataSource: 'customTextParameters',
          },
          {
            key: 'current_length',
            dataSource: 'customTextParameters',
          },
        ],
      });
    });

    const validationIssue: Omit<BackendValidationIssue, 'dataElementId'> = {
      severity: 1,
      source: 'SomeCustomValidator',
      field: 'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value',
      customTextKey: 'custom_error_too_long',
      customTextParameters: {
        max_length: '10',
        current_length: '19',
      },
    };

    let dataElementId = '';
    await intercept(
      page,
      { method: 'GET', url: '**/bootstrap-form/Task_2**' },
      modifyJsonResponse<FormBootstrapResponse>((body) => {
        dataElementId = body.dataModels['ServiceModel-test'].dataElementId!;
        body.dataModels['ServiceModel-test'].initialValidationIssues!.push({ ...validationIssue, dataElementId });
      }),
    );

    await intercept(
      page,
      { method: 'PATCH', url: '**/data**' },
      modifyJsonResponse<IDataModelMultiPatchResponse>((body) => {
        body.validationIssues.push({ source: validationIssue.source, issues: [{ ...validationIssue, dataElementId }] });
      }),
    );

    await goto(page, 'changename');
    await waitForLoad(page);

    await expect(page.locator(appFrontend.fieldValidation('newMiddleName'))).toHaveText(
      exactText('Verdien kan ikke være lengre enn 10, den er nå 19'),
    );
    await expect(page.locator(appFrontend.errorReport)).toHaveCount(0);
    await type(page.locator(appFrontend.changeOfName.newFirstName), 'a');
    await page
      .locator(appFrontend.changeOfName.confirmChangeName)
      .getByRole('checkbox', { name: /Ja[a-z, ]*/ })
      .check();
    await getButtonByRole(page, { name: /Neste/ }).click();
    await expect(page.locator(appFrontend.errorReport)).toContainText(
      'Verdien kan ikke være lengre enn 10, den er nå 19',
    );
  });
});
