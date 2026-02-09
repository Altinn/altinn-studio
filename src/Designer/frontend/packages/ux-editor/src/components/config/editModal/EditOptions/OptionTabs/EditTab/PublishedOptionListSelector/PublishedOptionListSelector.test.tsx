import type { PublishedOptionListSelectorProps } from './PublishedOptionListSelector';
import { createPublishedCodeListReferenceString } from '../../utils/published-code-list-reference-utils';
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

// Test data:
const orgName = 'some-org';
const component: FormItem<SelectionComponentType> = {
  ...componentMocks[ComponentType.RadioButtons],
  optionsId: undefined,
  options: undefined,
};
const defaultProps: PublishedOptionListSelectorProps = {
  component,
  handleComponentChange: jest.fn(),
  orgName,
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

  it('Calls handleComponentChange with the updated component when the user fills out the fields and saves the form', async () => {
    const user = setupUser();
    const codeListName = 'new-code-list';
    const version = '2';
    const handleComponentChange = jest.fn();
    renderPublishedOptionListSelectorWithFeatureFlag({ handleComponentChange });

    await user.openForm();
    await user.typeName(codeListName);
    await user.typeVersion(version);
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
    await user.typeVersion('2');
    await user.clickSave();

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Disables the save button when fields are empty', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();

    expect(getSaveButton()).toBeDisabled();
  });

  it('Disables the save button when version is invalid', async () => {
    const user = setupUser();
    renderPublishedOptionListSelectorWithFeatureFlag();

    await user.openForm();
    await user.typeName('code-list');
    await user.typeVersion('invalid-version');

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
  typeVersion: (version: string) => Promise<void>;
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
    async typeVersion(version: string): Promise<void> {
      const versionInputLabel = textMock('ux_editor.options.published_code_list.version');
      const versionInput = screen.getByRole('textbox', { name: versionInputLabel });
      await this.type(versionInput, version);
    },
    async clickSave(): Promise<void> {
      await this.click(getSaveButton());
    },
  };
}

function getPublishedCodeListButton(): HTMLElement {
  const buttonText = textMock('ux_editor.options.published_code_list.choose');
  return screen.getByRole('button', { name: buttonText });
}

function getSaveButton(): HTMLElement {
  return screen.getByRole('button', { name: textMock('general.save') });
}
