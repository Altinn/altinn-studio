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
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import type { ExtendedRenderOptions } from '../../../../../../../testing/mocks';
import { FeatureFlag } from '@studio/feature-flags';
import React from 'react';
import { PublishedOptionListSelector } from './PublishedOptionListSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';

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

describe('PublishedOptionListSelector', () => {
  it('Renders the button for choosing a published code list', () => {
    renderPublishedOptionListSelectorWithFeatureFlag();
    expect(getPublishedCodeListButton()).toBeInTheDocument();
  });

  it('Does not render any button when the feature flag is not activated', () => {
    renderPublishedOptionListSelector();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Does not display any form initially', () => {
    renderPublishedOptionListSelectorWithFeatureFlag();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Displays the published code list selection form when the user clicks the button', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();

    const formName = textMock('ux_editor.options.published_code_list.choose');
    expect(screen.getByRole('group', { name: formName })).toBeInTheDocument();
  });

  it('Renders the latest version radio button as checked by default', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();
    await user.openForm();
    expectLatestVersionState();
  });

  it('Displays the form correctly when the version is latest', async () => {
    const user = setupUser();
    const referenceValues = { codeListName: 'name', version: latestVersionString, orgName };
    const testComponent = createComponentWithReference(referenceValues);
    renderPublishedOptionListSelectorWithFeatureFlag({ component: testComponent });
    await user.openForm();
    expectLatestVersionState();
  });

  it('Displays the form correctly when the version is fixed', async () => {
    const user = setupUser();
    const referenceValues = { codeListName: 'name', version: '2', orgName };
    const testComponent = createComponentWithReference(referenceValues);
    renderPublishedOptionListSelectorWithFeatureFlag({ component: testComponent });
    await user.openForm();
    expectFixedVersionState(2);
  });

  it('Updates the form correctly when the user switches to fixed version and types a number', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();
    await user.checkFixedVersion();
    await user.typeVersionNumber('3');

    expectFixedVersionState(3);
  });

  it('Updates the form correctly when the user switches to fixed version and back to latest', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();
    await user.checkFixedVersion();
    await user.checkLatestVersion();

    expectLatestVersionState();
  });

  it('Calls handleComponentChange with the updated component when the user fills out the fields with the latest version and saves the form', async () => {
    const user = setupUser();
    const codeListName = 'new-code-list';
    const handleComponentChange = jest.fn();
    renderPublishedOptionListSelectorWithFeatureFlag({ handleComponentChange });

    await user.openForm();
    await user.typeName(codeListName);
    await user.checkLatestVersion();
    await user.clickSave();

    const expectedReferenceValues = { codeListName, version: latestVersionString, orgName };
    const expectedOptionsId = createPublishedCodeListReferenceString(expectedReferenceValues);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ optionsId: expectedOptionsId }),
    );
  });

  it('Calls handleComponentChange with the updated component when the user fills out the fields with a fixed version and saves the form', async () => {
    const user = setupUser();
    const codeListName = 'new-code-list';
    const version = '2';
    const handleComponentChange = jest.fn();
    renderPublishedOptionListSelectorWithFeatureFlag({ handleComponentChange });

    await user.openForm();
    await user.typeName(codeListName);
    await user.checkFixedVersion();
    await user.typeVersionNumber(version);
    await user.clickSave();

    const expectedReferenceValues = { codeListName, version, orgName };
    const expectedOptionsId = createPublishedCodeListReferenceString(expectedReferenceValues);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ optionsId: expectedOptionsId }),
    );
  });

  it('Closes the form when the user clicks the save button', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();
    await user.typeName('code-list');
    await user.clickSave();

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Disables the save button when fields are empty', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();

    expect(getSaveButton()).toBeDisabled();
  });

  it('Disables the save button when fixed version is checked but the field is empty', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();
    await user.typeName('code-list');
    await user.checkFixedVersion();

    expect(getSaveButton()).toBeDisabled();
  });
});

function renderPublishedOptionListSelectorWithFeatureFlag(
  props?: Partial<PublishedOptionListSelectorProps>,
): RenderResult {
  return renderPublishedOptionListSelector(props, { featureFlags: [FeatureFlag.NewCodeLists] });
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
  typeName: (name: string) => Promise<void>;
  checkLatestVersion: () => Promise<void>;
  checkFixedVersion: () => Promise<void>;
  typeVersionNumber: (version: string) => Promise<void>;
  clickSave: () => Promise<void>;
}

function setupUser(): ExtendedUserEvent {
  const user = userEvent.setup();
  return {
    ...user,
    async openForm(): Promise<void> {
      await this.click(getPublishedCodeListButton());
    },
    async typeName(name: string): Promise<void> {
      const nameInputLabel = textMock('ux_editor.options.published_code_list.name');
      const codeListNameInput = screen.getByRole('textbox', { name: nameInputLabel });
      await this.type(codeListNameInput, name);
    },
    async checkLatestVersion(): Promise<void> {
      await this.click(getLatestVersionRadioButton());
    },
    async checkFixedVersion(): Promise<void> {
      await this.click(getFixedVersionRadioButton());
    },
    async typeVersionNumber(version: string): Promise<void> {
      await this.type(getVersionNumberInput(), version);
    },
    async clickSave(): Promise<void> {
      await this.click(getSaveButton());
    },
  };
}

function getPublishedCodeListButton(): HTMLElement {
  return screen.getByRole('button', { name: openFormButtonText });
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
