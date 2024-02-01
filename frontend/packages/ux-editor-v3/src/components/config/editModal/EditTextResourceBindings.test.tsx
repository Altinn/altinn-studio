import React from 'react';
import type { EditTextResourceBindingsProps } from './EditTextResourceBindings';
import { EditTextResourceBindings } from './EditTextResourceBindings';
import { act, screen, waitFor } from '@testing-library/react';
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
import userEvent from '@testing-library/user-event';

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

  test('that it renders with expected text resource binding keys', async () => {
    const textResourceBindingKeys = ['title', 'description', 'help'];
    await renderEditTextResourceBindingsComponent({ textResourceBindingKeys });
    const label = screen.getByText(
      textMock(`ux_editor.modal_properties_textResourceBindings_test`),
    );
    const text = screen.getByText('This is a test');
    expect(label).toBeInTheDocument();
    expect(text).toBeInTheDocument();
  });

  test('that it renders no text resource bindings if none are added', async () => {
    await renderEditTextResourceBindingsComponent({
      component: { ...mockComponent, textResourceBindings: {} },
    });
    const titleLabel = screen.queryByText(
      textMock(`ux_editor.modal_properties_textResourceBindings_title`),
    );
    expect(titleLabel).not.toBeInTheDocument();
    const searchTextButton = screen.queryByRole('button', { name: textMock('general.search') });
    expect(searchTextButton).not.toBeInTheDocument();
  });

  test('that it renders the combobox for selecting text resource binding keys to add', async () => {
    const textResourceBindingKeys = ['title', 'description', 'help'];
    await renderEditTextResourceBindingsComponent({ textResourceBindingKeys });
    const selectTextResourcesCombobox = screen.getByRole('combobox', {
      name: textMock('ux_editor.text_resource_bindings.add_label'),
    });
    expect(selectTextResourcesCombobox).toBeInTheDocument();
  });

  test('that the combobox for selecting text resource binding keys only contains keys that are not already added', async () => {
    const textResourceBindingKeys = ['title', 'description', 'help'];
    await renderEditTextResourceBindingsComponent({ textResourceBindingKeys });
    const selectTextResourcesCombobox = screen.getByRole('combobox', {
      name: textMock('ux_editor.text_resource_bindings.add_label'),
    });

    await act(() => userEvent.click(selectTextResourcesCombobox)); // eslint-disable-line testing-library/no-unnecessary-act
    let options = screen.getAllByRole('option');
    expect(options.length).toBe(3);

    await act(() => userEvent.click(options[0])); // eslint-disable-line testing-library/no-unnecessary-act
    await act(() => userEvent.click(selectTextResourcesCombobox)); // eslint-disable-line testing-library/no-unnecessary-act
    options = screen.getAllByRole('option');
    expect(options.length).toBe(2);
  });

  test('that it does not render the combobox for selecting text resource binding keys when all available keys are added', async () => {
    const textResourceBindingKeys = ['test'];
    await renderEditTextResourceBindingsComponent({ textResourceBindingKeys });
    const selectTextResourcesCombobox = screen.queryByRole('combobox', {
      name: textMock('ux_editor.text_resource_bindings.add_label'),
    });
    const addTextResourceButton = screen.queryByRole('button', { name: textMock('general.add') });
    expect(selectTextResourcesCombobox).not.toBeInTheDocument();
    expect(addTextResourceButton).not.toBeInTheDocument();
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
    textResourceBindingKeys = [],
  }: Partial<EditTextResourceBindingsProps>) => {
    await waitForData();

    return renderWithMockStore()(
      <EditTextResourceBindings
        component={component}
        handleComponentChange={handleComponentChange}
        textResourceBindingKeys={textResourceBindingKeys}
      />,
    );
  };
});
