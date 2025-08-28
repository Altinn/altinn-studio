import type { RenderResult } from '@testing-library/react';
import { waitFor, screen } from '@testing-library/react';
import type { ExtendedRenderOptions } from '../../../../../../../testing/mocks';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import type { ManualOptionsDialogProps } from './';
import { ManualOptionsDialog } from './';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResources, ITextResourcesObjectFormat } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import {
  description1TextResource,
  description2TextResource,
  label1TextResource,
  label2TextResource,
  textResourcesMock,
} from 'app-shared/mocks/textResourcesMock';

import type { MutableRefObject } from 'react';
import React, { createRef } from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { Option } from 'app-shared/types/Option';

// Test data:
const component = componentMocks[ComponentType.RadioButtons];
const handleComponentChange = jest.fn();
const textResources: ITextResources = {
  [DEFAULT_LANGUAGE]: textResourcesMock.resources,
};
const defaultProps: ManualOptionsDialogProps = {
  component,
  handleComponentChange,
  textResources,
};

// Mocks:
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('ManualOptionsDialog', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders a dialog', async () => {
    renderCodeListDialog();
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
  });

  it('Makes it possible to display the dialog using the ref', async () => {
    await renderAndShowCodeListDialog();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('Displays the code list editor when the component has manual options set', async () => {
    await renderAndShowCodeListDialog();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('Does not render with the code list editor when the component refers to an external list', async () => {
    const componentWithExternalList: FormItem<ComponentType.RadioButtons> = {
      ...component,
      options: undefined,
      optionsId: 'external-list-id',
    };
    await renderAndShowCodeListDialog({ props: { component: componentWithExternalList } });
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Calls handleComponentChange with the updated component when the user changes the code list', async () => {
    const newCode = 'new-code';
    const user = userEvent.setup();

    await renderAndShowCodeListDialog();
    await user.type(getFirstCodeInput(), newCode);
    await user.tab();

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([expect.objectContaining({ value: newCode })]),
      }),
    );
  });

  it('Calls handleComponentChange with correct parameters when the user closes the dialog and there are no options', async () => {
    const user = userEvent.setup();
    const componentWithoutOptions: FormItem<ComponentType.RadioButtons> = {
      ...component,
      options: [],
    };

    await renderAndShowCodeListDialog({ props: { component: componentWithoutOptions } });
    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...componentWithoutOptions,
      options: undefined,
      optionsId: undefined,
    });
  });

  it('Calls upsertTextResource with correct parameters when the user edits a text', async () => {
    const options: Option[] = [
      { value: 'value1', label: label1TextResource.id, description: description1TextResource.id },
      { value: 'value2', label: label2TextResource.id, description: description2TextResource.id },
    ];
    const testComponent: FormItem<ComponentType.RadioButtons> = { ...component, options };
    const props: Partial<ManualOptionsDialogProps> = { component: testComponent };
    const org = 'org';
    const app = 'app';
    const appRouteParams = { org, app };
    const upsertTextResources = jest.fn();
    const queries: Partial<ServicesContextProps> = { upsertTextResources };
    const text = 'test';

    const user = userEvent.setup();
    await renderAndShowCodeListDialog({ props, appRouteParams, queries });
    await user.type(getFirstDescriptionInput(), text);
    await user.tab();

    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    const expectedPayload: ITextResourcesObjectFormat = { [description1TextResource.id]: text };
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, DEFAULT_LANGUAGE, expectedPayload);
  });
});

type RenderCodeListDialogArgs = {
  props?: Partial<ManualOptionsDialogProps>;
  ref?: MutableRefObject<HTMLDialogElement>;
} & Partial<ExtendedRenderOptions>;

function renderCodeListDialog({
  props = {},
  ref,
  ...renderOptions
}: RenderCodeListDialogArgs = {}): RenderResult {
  return renderWithProviders(
    <ManualOptionsDialog {...defaultProps} {...props} ref={ref} />,
    renderOptions,
  );
}

async function renderAndShowCodeListDialog(args?: RenderCodeListDialogArgs): Promise<RenderResult> {
  const ref = createRef<HTMLDialogElement>();
  const utils = renderCodeListDialog({ ...args, ref });
  ref.current.showModal();
  await waitFor(expect(screen.getByRole('dialog')).toBeVisible);
  return utils;
}

function getFirstCodeInput(): HTMLElement {
  const key = 'code_list_editor.value_item';
  return screen.getByRole('textbox', { name: textMock(key, { number: 1 }) });
}

function getFirstDescriptionInput(): HTMLElement {
  const key = 'code_list_editor.text_resource.description.value';
  return screen.getByRole('textbox', { name: textMock(key, { number: 1 }) });
}
