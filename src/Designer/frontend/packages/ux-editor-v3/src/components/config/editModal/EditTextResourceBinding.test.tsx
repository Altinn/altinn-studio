import React from 'react';
import type { EditTextResourceBindingProps } from './EditTextResourceBinding';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderHookWithMockStore,
  renderWithMockStore,
  textLanguagesMock,
} from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { FormComponent } from '../../../types/FormComponent';

const user = userEvent.setup();

describe('EditTextResourceBindings component', () => {
  const mockComponent: FormComponent = {
    id: 'test-id',
    textResourceBindings: {
      test: 'test-text',
    },
    type: ComponentTypeV3.Input,
    itemType: 'COMPONENT',
    dataModelBindings: {},
  };

  const textResources: ITextResource[] = [
    {
      id: 'test-text',
      value: 'This is a test',
    },
  ];

  test('that it renders', async () => {
    await renderEditTextResourceBindingsComponent({});
    const label = screen.getByText(textMock('ux_editor.modal_text'));
    const textResourceValue = screen.getByText('This is a test');
    expect(label).toBeInTheDocument();
    expect(textResourceValue).toBeInTheDocument();
  });

  test('that handleComponentChange is called when adding a new text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
      textKey: 'does-not-exist',
    });
    await user.click(screen.getByLabelText(textMock('general.add')));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
  });

  test('that handleComponentChange is called when choosing existing text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
      textKey: 'does-not-exist',
    });

    // Click search button
    await user.click(screen.getByLabelText(textMock('general.search')));

    // Select with existing texts should be shown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    await user.click(select);

    // Select text from available options
    await user.selectOptions(select, textResources[0].id);
    // await user.click(screen.getByRole('option', { name: textResources[0].id }));

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      textResourceBindings: {
        ...mockComponent.textResourceBindings,
        'does-not-exist': 'test-text',
      },
    });
  });

  test('That handleComponentChange and removeTextResourceBinding are called when confirm delete textResourceBinding button is clicked', async () => {
    const handleComponentChange = jest.fn();
    const removeTextResourceBinding = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
      removeTextResourceBinding,
    });
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.text_resource_bindings.delete_confirm'),
      }),
    );
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      textResourceBindings: {},
    });
    expect(removeTextResourceBinding).toHaveBeenCalledTimes(1);
  });

  const waitForData = async () => {
    const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
      .renderHookResult.result;
    const { result } = renderHookWithMockStore(
      {},
      {
        getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
        getTextResources: (_o, _a, lang) =>
          Promise.resolve<ITextResourcesWithLanguage>({
            language: lang,
            resources: textResources,
          }),
      },
    )(() => useTextResourcesQuery(org, app)).renderHookResult;
    await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  };

  const renderEditTextResourceBindingsComponent = async ({
    component = mockComponent,
    handleComponentChange = () => {},
    removeTextResourceBinding = () => {},
    textKey = 'test',
    labelKey = 'ux_editor.modal_text',
  }: Partial<EditTextResourceBindingProps>) => {
    await waitForData();

    return renderWithMockStore()(
      <EditTextResourceBinding
        component={component}
        handleComponentChange={handleComponentChange}
        removeTextResourceBinding={removeTextResourceBinding}
        textKey={textKey}
        labelKey={labelKey}
      />,
    );
  };
});
