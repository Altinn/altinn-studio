import React from 'react';
import { screen } from '@testing-library/react';
import { ReferenceTab } from './ReferenceTab';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../testing/componentMocks';

// Test data:
const mockComponent = componentMocks[ComponentType.Dropdown];
const mockOptionsId1 = 'test1';
const mockOptionsId2 = 'test2';
const getOptionListIds = jest
  .fn()
  .mockImplementation(() => Promise.resolve<string[]>([mockOptionsId1, mockOptionsId2]));
const handleComponentChange = jest.fn();

describe('ReferenceTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render a spinner', () => {
    renderReferenceTab();
    expect(screen.getByText(textMock('ux_editor.modal_properties_loading'))).toBeInTheDocument();
  });

  it('should render the component', () => {
    renderReferenceTab();

    expect(
      screen.getByText(textMock('ux_editor.options.code_list_reference_id.description')),
    ).toBeInTheDocument();
  });

  it('should render value when optionsId is set', () => {
    renderReferenceTab({
      componentProps: {
        optionsId: 'some-id',
      },
    });

    expect(getInputElement()).toHaveValue('some-id');
  });

  it('should render no value if optionsId is a codeList from the library', () => {
    renderReferenceTab({
      componentProps: {
        optionsId: mockOptionsId1,
      },
    });

    expect(getInputElement()).toHaveValue('');
  });

  it('should call handleComponentChange when input value changes', async () => {
    const user = userEvent.setup();
    renderReferenceTab();
    const inputElement = getInputElement();
    await user.type(inputElement, 'new-id');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'new-id',
    });
  });

  it('should call remove options property (if it exists) when input value changes', async () => {
    const user = userEvent.setup();
    renderReferenceTab({
      componentProps: {
        options: [
          {
            value: 'value',
            label: 'text',
          },
        ],
      },
    });
    const inputElement = getInputElement();
    await user.type(inputElement, 'new-id');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'new-id',
    });
  });
});

function getInputElement() {
  return screen.getByRole('textbox', {
    name: textMock('ux_editor.modal_properties_custom_code_list_id'),
  });
}

const renderReferenceTab = ({
  componentProps = {},
}: {
  handleComponentChange?: () => void;
  componentProps?: Partial<
    FormComponent<ComponentType.RadioButtons | ComponentType.Checkboxes | ComponentType.Dropdown>
  >;
} = {}) => {
  renderWithProviders(
    <ReferenceTab
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
    />,
    { queries: { getOptionListIds } },
  );
};
