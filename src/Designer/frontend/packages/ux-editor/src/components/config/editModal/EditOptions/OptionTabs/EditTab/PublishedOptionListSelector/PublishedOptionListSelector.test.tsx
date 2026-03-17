import type { PublishedOptionListSelectorProps } from './PublishedOptionListSelector';
import {
  createPublishedCodeListReferenceString,
  latestVersionString,
} from '../../utils/published-code-list-reference-utils';
import type { FormItem } from '../../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { RenderResult } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import type { ExtendedRenderOptions } from '../../../../../../../testing/mocks';
import { FeatureFlag } from '@studio/feature-flags';
import React from 'react';
import { PublishedOptionListSelector } from './PublishedOptionListSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PUBLISHED_CODE_LIST_FOLDER } from 'app-shared/constants';

// Test data:
const orgName = 'some-org';
const component: FormItem<SelectionComponentType> = {
  ...componentMocks[ComponentType.RadioButtons],
  optionsId: undefined,
  options: undefined,
};
const openFormButtonText = 'Open';
const defaultProps: PublishedOptionListSelectorProps = {
  component,
  handleComponentChange: jest.fn(),
  orgName,
  triggerProps: { children: openFormButtonText },
};
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';
const codeListFiles: string[] = [
  '_index.json',
  `${codeListName1}/1.json`,
  `${codeListName1}/2.json`,
  `${codeListName1}/_index.json`,
  `${codeListName1}/_latest.json`,
  `${codeListName2}/1.json`,
  `${codeListName2}/2.json`,
  `${codeListName2}/3.json`,
  `${codeListName2}/_index.json`,
  `${codeListName2}/_latest.json`,
];

describe('PublishedOptionListSelector', () => {
  it('Renders the button for choosing a published code list', () => {
    renderPublishedOptionListSelectorWithData();
    expect(getPublishedCodeListButton()).toBeInTheDocument();
  });

  it('Does not render any button when the feature flag is not activated', () => {
    renderPublishedOptionListSelector();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Does not display any form initially', () => {
    renderPublishedOptionListSelectorWithData();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Displays the published code list selection form when the user clicks the button', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();

    await user.openForm();

    const formName = textMock('ux_editor.options.published_code_list.choose');
    expect(screen.getByRole('group', { name: formName })).toBeInTheDocument();
  });

  it('Renders the latest version radio button as checked by default', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();
    await user.openForm();
    expectLatestVersionState();
  });

  it('Displays the form correctly when the version is latest', async () => {
    const user = setupUser();
    const referenceValues = { codeListName: codeListName1, version: latestVersionString, orgName };
    const testComponent = createComponentWithReference(referenceValues);
    renderPublishedOptionListSelectorWithData({ component: testComponent });
    await user.openForm();
    expectLatestVersionState();
  });

  it('Displays the form correctly when the version is fixed', async () => {
    const user = setupUser();
    const referenceValues = { codeListName: codeListName1, version: '2', orgName };
    const testComponent = createComponentWithReference(referenceValues);
    renderPublishedOptionListSelectorWithData({ component: testComponent });
    await user.openForm();
    expectFixedVersionState(2);
  });

  it('Updates the form correctly when the user switches to fixed version and types a number', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();

    await user.openForm();
    await user.checkFixedVersion();
    await user.typeVersionNumber('1');

    expectFixedVersionState(1);
  });

  it('Updates the form correctly when the user switches to fixed version and back to latest', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();

    await user.openForm();
    await user.checkFixedVersion();
    await user.checkLatestVersion();

    expectLatestVersionState();
  });

  it('Calls handleComponentChange with the updated component when the user fills out the fields with the latest version and saves the form', async () => {
    const user = setupUser();
    const handleComponentChange = jest.fn();
    renderPublishedOptionListSelectorWithData({ handleComponentChange });

    await user.openForm();
    await user.pickName(codeListName1);
    await user.checkLatestVersion();
    await user.clickSave();

    const expectedReferenceValues = {
      codeListName: codeListName1,
      version: latestVersionString,
      orgName,
    };
    const expectedOptionsId = createPublishedCodeListReferenceString(expectedReferenceValues);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ optionsId: expectedOptionsId }),
    );
  });

  it('Calls handleComponentChange with the updated component when the user fills out the fields with a fixed version and saves the form', async () => {
    const user = setupUser();
    const version = '2';
    const handleComponentChange = jest.fn();
    renderPublishedOptionListSelectorWithData({ handleComponentChange });

    await user.openForm();
    await user.pickName(codeListName1);
    await user.checkFixedVersion();
    await user.typeVersionNumber(version);
    await user.clickSave();

    const expectedReferenceValues = { codeListName: codeListName1, version, orgName };
    const expectedOptionsId = createPublishedCodeListReferenceString(expectedReferenceValues);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ optionsId: expectedOptionsId }),
    );
  });

  it('Closes the form when the user clicks the save button', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();

    await user.openForm();
    await user.pickName(codeListName1);
    await user.clickSave();

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  describe('Sets the fixed version number to the one that is currently latest when …', () => {
    test('… the user initially picks a code list', async () => {
      const user = setupUser();
      renderPublishedOptionListSelectorWithData();

      await user.openForm();
      await user.pickName(codeListName2);
      await user.checkFixedVersion();

      expect(getVersionNumberInput()).toHaveValue(3);
    });

    test('… the user has chosen some code list and switches to another one', async () => {
      const user = setupUser();
      renderPublishedOptionListSelectorWithData();

      await user.openForm();
      await user.pickName(codeListName2);
      await user.checkFixedVersion();
      await user.pickName(codeListName1);

      expect(getVersionNumberInput()).toHaveValue(2);
    });
  });

  test('The version number field is empty by default when no code list is chosen', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData();

    await user.openForm();
    await user.checkFixedVersion();

    expect(getVersionNumberInput()).toHaveValue(null);
  });

  describe('When the user tries to save invalid data …', () => {
    test('… and no name is chosen, the name input field is invalidated and the change callback is not fired', async () => {
      const user = setupUser();
      const handleComponentChange = jest.fn();
      renderPublishedOptionListSelectorWithData({ handleComponentChange });

      await user.openForm();
      await user.clearName();
      await user.checkLatestVersion();
      await user.clickSave();

      expect(getNameInput()).toBeInvalid();
      expect(handleComponentChange).not.toHaveBeenCalled();
    });

    test('… and fixed version is chosen without a number, the version number field is invalidated and the change callback is not fired', async () => {
      const user = setupUser();
      const handleComponentChange = jest.fn();
      renderPublishedOptionListSelectorWithData({ handleComponentChange });

      await user.openForm();
      await user.pickName(codeListName1);
      await user.checkFixedVersion();
      await user.clearVersionNumber();
      await user.clickSave();

      expect(getVersionNumberInput()).toBeInvalid();
      expect(handleComponentChange).not.toHaveBeenCalled();
    });

    test('… and fixed version is chosen with an inexistent version number, the version number field is invalidated and the change callback is not fired', async () => {
      const user = setupUser();
      const handleComponentChange = jest.fn();
      renderPublishedOptionListSelectorWithData({ handleComponentChange });

      await user.openForm();
      await user.pickName(codeListName1);
      await user.checkFixedVersion();
      await user.typeVersionNumber('100');
      await user.clickSave();

      expect(getVersionNumberInput()).toBeInvalid();
      expect(handleComponentChange).not.toHaveBeenCalled();
    });
  });

  it('Displays an error message instead of a form when the query for published code lists fails', async () => {
    const user = setupUser();
    const getPublishedResources = jest.fn().mockRejectedValue(new Error());
    renderPublishedOptionListSelectorWithFeatureFlag({}, { queries: { getPublishedResources } });

    await user.openForm();
    await waitFor(expect(getPublishedResources).toHaveBeenCalled);

    const expectedMessage = textMock('ux_editor.options.published_code_list.loading_error');
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });

  it('Displays a message instead of a form when there are no published code lists', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithData({}, []);

    await user.openForm();

    const expectedMessage = textMock('ux_editor.options.published_code_list.no_lists');
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });
});

function renderPublishedOptionListSelectorWithData(
  props?: Partial<PublishedOptionListSelectorProps>,
  data: string[] = codeListFiles,
): RenderResult {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.PublishedResources, orgName, PUBLISHED_CODE_LIST_FOLDER],
    data,
  );
  return renderPublishedOptionListSelectorWithFeatureFlag(props, { queryClient });
}

function renderPublishedOptionListSelectorWithFeatureFlag(
  props?: Partial<PublishedOptionListSelectorProps>,
  renderOptions?: Partial<ExtendedRenderOptions>,
): RenderResult {
  return renderPublishedOptionListSelector(props, {
    featureFlags: [FeatureFlag.NewCodeLists],
    ...renderOptions,
  });
}

function renderPublishedOptionListSelector(
  props?: Partial<PublishedOptionListSelectorProps>,
  renderOptions?: Partial<ExtendedRenderOptions>,
): RenderResult {
  return renderWithProviders(
    <PublishedOptionListSelector {...defaultProps} {...props} />,
    renderOptions,
  );
}

interface ExtendedUserEvent extends UserEvent {
  openForm: () => Promise<void>;
  pickName: (name: string) => Promise<void>;
  clearName: () => Promise<void>;
  checkLatestVersion: () => Promise<void>;
  checkFixedVersion: () => Promise<void>;
  typeVersionNumber: (version: string) => Promise<void>;
  clearVersionNumber: () => Promise<void>;
  clickSave: () => Promise<void>;
}

function setupUser(): ExtendedUserEvent {
  const user = userEvent.setup();
  return {
    ...user,
    async openForm(): Promise<void> {
      await this.click(getPublishedCodeListButton());
    },
    async pickName(name: string): Promise<void> {
      await this.selectOptions(getNameInput(), screen.getByRole('option', { name }));
    },
    async clearName(): Promise<void> {
      await this.pickName(textMock('ux_editor.options.published_code_list.name_placeholder'));
    },
    async checkLatestVersion(): Promise<void> {
      await this.click(getLatestVersionRadioButton());
    },
    async checkFixedVersion(): Promise<void> {
      await this.click(getFixedVersionRadioButton());
    },
    async typeVersionNumber(version: string): Promise<void> {
      await this.clearVersionNumber();
      await this.type(getVersionNumberInput(), version);
    },
    async clearVersionNumber(): Promise<void> {
      await this.clear(getVersionNumberInput());
    },
    async clickSave(): Promise<void> {
      await this.click(getSaveButton());
    },
  };
}

function getPublishedCodeListButton(): HTMLElement {
  return screen.getByRole('button', { name: openFormButtonText });
}

function getNameInput(): HTMLElement {
  const name = textMock('ux_editor.options.published_code_list.name');
  return screen.getByRole('combobox', { name });
}

function getSaveButton(): HTMLElement {
  return screen.getByRole('button', { name: textMock('general.save') });
}

function expectLatestVersionState(): void {
  expect(getLatestVersionRadioButton()).toBeChecked();
  expect(getFixedVersionRadioButton()).not.toBeChecked();
  expect(getVersionNumberInput()).toBeDisabled();
}

function expectFixedVersionState(version: number): void {
  expect(getLatestVersionRadioButton()).not.toBeChecked();
  expect(getFixedVersionRadioButton()).toBeChecked();
  expect(getVersionNumberInput()).toBeEnabled();
  expect(getVersionNumberInput()).toHaveValue(version);
}

function getLatestVersionRadioButton(): HTMLElement {
  const latestVersionLabel = textMock('ux_editor.options.published_code_list.latest_version');
  return screen.getByRole('radio', { name: latestVersionLabel });
}

function getFixedVersionRadioButton(): HTMLElement {
  const fixedVersionLabel = textMock('ux_editor.options.published_code_list.fixed_version');
  return screen.getByRole('radio', { name: fixedVersionLabel });
}

function getVersionNumberInput(): HTMLElement {
  const versionNumberInputLabel = textMock('ux_editor.options.published_code_list.version');
  return screen.getByRole('spinbutton', { name: versionNumberInputLabel });
}

function createComponentWithReference(
  referenceValues: PublishedCodeListReferenceValues,
): FormItem<SelectionComponentType> {
  const optionsId = createPublishedCodeListReferenceString(referenceValues);
  return { ...component, optionsId };
}
