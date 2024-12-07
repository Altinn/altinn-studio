import React from 'react';
import { screen } from '@testing-library/react';
import { ReferenceTab } from './ReferenceTab';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../testing/componentMocks';

const mockComponent = componentMocks[ComponentType.Dropdown];

describe('ReferenceTab', () => {
  it('should render', () => {
    renderReferenceTab();
    expect(
      screen.getByText(textMock('ux_editor.options.code_list_referenceId.description')),
    ).toBeInTheDocument();
  });

  it('should render value when optionsId is set', () => {
    renderReferenceTab({
      componentProps: {
        optionsId: 'some-id',
      },
    });
    expect(screen.getByDisplayValue('some-id')).toBeInTheDocument();
  });

  it('should call handleComponentChange when input value changes', async () => {
    const handleComponentChange = jest.fn();
    renderReferenceTab({ handleComponentChange });
    const user = userEvent.setup();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, 'new-id');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'new-id',
    });
  });

  it('should call remove options property (if it exists) when input value changes', async () => {
    const handleComponentChange = jest.fn();
    renderReferenceTab({
      handleComponentChange,
      componentProps: {
        options: [
          {
            value: 'value',
            label: 'text',
          },
        ],
      },
    });
    const user = userEvent.setup();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, 'new-id');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'new-id',
    });
  });
});

const renderReferenceTab = ({
  handleComponentChange = jest.fn(),
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
  );
};
