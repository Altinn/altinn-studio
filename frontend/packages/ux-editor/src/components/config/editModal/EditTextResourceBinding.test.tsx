import React from 'react';
import { EditTextResourceBinding, EditTextResourceBindingProps } from './EditTextResourceBinding';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import type { ITextResource } from 'app-shared/types/global';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ITextResourcesWithLanguage } from 'app-shared/types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { FormComponent } from '../../../types/FormComponent';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const addText = 'Legg til';
const searchText = 'Søk';
const texts: Record<string, string> = {
  'ux_editor.modal_text': 'Tekst',
  'general.add': addText,
  'general.search': searchText,
};
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

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
      value: 'This is a test'
    }
  ];

  test('that it renders', async () => {
    await renderEditTextResourceBindingsComponent({});
    const label = screen.getByText('Tekst');
    const textResourceValue = screen.getByText('This is a test');
    expect(label).toBeInTheDocument();
    expect(textResourceValue).toBeInTheDocument();
  });

  test('that handleComponentChange is called when adding a new text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({ handleComponentChange, textKey: 'does-not-exist' });
    await act(() => user.click(screen.getByLabelText(addText)));
    expect(handleComponentChange).toBeCalledTimes(1);
  });

  test('that handleComponentChange is called when choosing existing text', async () => {
    const handleComponentChange = jest.fn();
    await renderEditTextResourceBindingsComponent({ handleComponentChange, textKey: 'does-not-exist' });

    // Click search button
    await act(() => user.click(screen.getByLabelText(searchText)));

    // Select with existing texts should be shown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    await act(() => user.click(select));

    // Select text from available options
    await act(() => user.click(screen.getByRole('option', { name: textResources[0].id })));

    expect(handleComponentChange).toBeCalledTimes(1);
    expect(handleComponentChange).toBeCalledWith({
      ...mockComponent,
      textResourceBindings: {
        ...mockComponent.textResourceBindings,
        'does-not-exist': 'test-text'
      }
    });
  });

  const renderEditTextResourceBindingsComponent = async ({
    component = mockComponent,
    handleComponentChange = () => {},
    textKey = 'test',
    labelKey = 'ux_editor.modal_text',
  }: Partial<EditTextResourceBindingProps>) => {

    const { result } = renderHookWithMockStore({}, {
      getTextLanguages: () => Promise.resolve(['nb', 'nn', 'en']),
      getTextResources: (_o, _a, lang) => Promise.resolve<ITextResourcesWithLanguage>({
        language: lang,
        resources: textResources
      }),
    })(() => useTextResourcesQuery(org, app)).renderHookResult;
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    return renderWithMockStore()(<EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={textKey}
      labelKey={labelKey}
    />);
  };
});
