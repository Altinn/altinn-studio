import React from 'react';
import { EditTextResourceBinding, EditTextResourceBindingProps } from './EditTextResourceBinding';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore, languageStateMock, appDataMock, textResourcesMock } from '../../../testing/mocks';
import { FormComponentType, ITextResource } from '../../../types/global';

describe(('EditTextResourceBindings component'), () => {
  const addText = 'Legg til';
  const searchText = 'Søk';
  const mockComponent = {
    id: 'test-id',
    textResourceBindings: {
      test: 'test-text',
    }
  } as FormComponentType;

  const language: Record<string, string> = {
    'ux_editor.modal_text': 'Tekst',
    'general.add': addText,
    'general.search': searchText,
  };

  const textResources: ITextResource[] = [
    {
      id: 'test-text',
      value: 'This is a test'
    }
  ];

  test('that it renders', async () => {
    renderEditTextResourceBindingsComponent({});
    const label = screen.getByText('Tekst');
    const textResourceValue = screen.getByText('This is a test');
    expect(label).toBeInTheDocument();
    expect(textResourceValue).toBeInTheDocument();
  });

  test('that handleComponentChange is called when adding a new text', async () => {
    const handleComponentChange = jest.fn();
    const { user } = renderEditTextResourceBindingsComponent({ handleComponentChange, textKey: 'does-not-exist' });
    await act(() => user.click(screen.getByLabelText(addText)));
    expect(handleComponentChange).toBeCalledTimes(1);
  });

  test('that handleComponentChange is called when choosing existing text', async () => {
    const handleComponentChange = jest.fn();
    const { user } = renderEditTextResourceBindingsComponent({ handleComponentChange, textKey: 'does-not-exist' });

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

  const renderEditTextResourceBindingsComponent = ({
    component = mockComponent,
    handleComponentChange = () => {},
    textKey = 'test',
    labelKey = 'ux_editor.modal_text',
  }: Partial<EditTextResourceBindingProps>) => {
    const user = userEvent.setup();
    renderWithMockStore({
      appData: {
        ...appDataMock,
        textResources: {
          ...textResourcesMock,
          resources: {
            nb: textResources
          }
        },
        languageState: {
          ...languageStateMock,
          language,
        }
      }
    })(<EditTextResourceBinding
          component={component}
          handleComponentChange={handleComponentChange}
          textKey={textKey}
          labelKey={labelKey}
      />);
    return { user };
  };
});
