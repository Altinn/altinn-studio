import React from 'react';
import type { EditTextResourceBindingProps } from './EditTextResourceBinding';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderHookWithProviders,
  renderWithProviders,
  textLanguagesMock,
} from '../../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../../hooks/queries/useLayoutSchemaQuery';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { FormComponent } from '../../../../../types/FormComponent';
import { app, org } from '@studio/testing/testids';

const user = userEvent.setup();

describe('EditTextResourceBindings component', () => {
  const mockComponent: FormComponent = {
    id: 'test-id',
    textResourceBindings: {
      test: 'test-text',
    },
    type: ComponentType.Input,
    itemType: 'COMPONENT',
    dataModelBindings: { simpleBinding: { field: '', dataType: '' } },
  };

  const textResources: ITextResource[] = [
    {
      id: 'test-text',
      value: 'This is a test',
    },
    {
      id: 'test-text-2',
      value: 'This is another test',
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
    const button = screen.getByRole('button', { name: textMock('ux_editor.modal_text') });
    await user.click(button);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
  });

  test('that handleComponentChange is called when choosing existing text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
    });
    const button = screen.getByRole('button', { name: textMock('ux_editor.modal_text') });
    await user.click(button);
    const searchTabLabel = textMock('ux_editor.text_resource_binding_search');
    const searchTab = screen.getByRole('tab', { name: searchTabLabel });
    await user.click(searchTab);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, textResources[1].id);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      textResourceBindings: {
        ...mockComponent.textResourceBindings,
        test: textResources[1].id,
      },
    });
  });

  test('That handleComponentChange and removeTextResourceBinding are called when confirm delete textResourceBinding button is clicked', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const handleComponentChange = jest.fn();
    const removeTextResourceBinding = jest.fn();
    await renderEditTextResourceBindingsComponent({
      handleComponentChange,
      removeTextResourceBinding,
    });
    const button = screen.getByRole('button', { name: textMock('ux_editor.modal_text') });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      textResourceBindings: {},
    });
    expect(removeTextResourceBinding).toHaveBeenCalledTimes(1);
  });

  const waitForData = async () => {
    const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
    const result = renderHookWithProviders(() => useTextResourcesQuery(org, app), {
      queries: {
        getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
        getTextResources: (_o, _a, lang) =>
          Promise.resolve<ITextResourcesWithLanguage>({
            language: lang,
            resources: textResources,
          }),
      },
    }).result;
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

    return renderWithProviders(
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
