import React from 'react';
import type { EditTextResourceBindingProps } from './EditTextResourceBinding';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderHookWithMockStore,
  renderWithMockStore,
  textLanguagesMock,
} from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import type { ITextResource } from 'app-shared/types/global';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { FormComponent } from '../../../types/FormComponent';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';

describe('EditTextResourceBindings component', () => {
  const mockComponent: FormComponent = {
    id: 'test-id',
    textResourceBindings: {
      test: 'test-text',
    },
    type: ComponentType.Input,
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
    await act(() => user.click(screen.getByLabelText(textMock('general.add'))));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
  });

  test('that handleComponentChange is called when choosing existing text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
      textKey: 'does-not-exist',
    });

    // Click search button
    await act(() => user.click(screen.getByLabelText(textMock('general.search'))));

    // Select with existing texts should be shown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    await act(() => user.click(select));

    // Select text from available options
    await act(() => user.click(screen.getByRole('option', { name: textResources[0].id })));

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
    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    await act(() =>
      user.click(
        screen.getByRole('button', {
          name: textMock('ux_editor.text_resource_bindings.delete_confirm'),
        }),
      ),
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
