import React from 'react';
import { screen } from '@testing-library/react';
import { EditCodeListReference } from './EditCodeListReference';
import { renderWithProviders } from '../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockComponent: FormComponent<ComponentType.RadioButtons> = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: { simpleBinding: '' },
};

const renderEditCodeListReference = ({
  handleComponentChange = jest.fn(),
  componentProps = {},
}: {
  handleComponentChange?: () => void;
  componentProps?: Partial<
    FormComponent<ComponentType.RadioButtons | ComponentType.Checkboxes | ComponentType.Dropdown>
  >;
} = {}) => {
  renderWithProviders(
    <EditCodeListReference
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
    />,
  );
};

describe('EditCodeListReference', () => {
  it('should render', () => {
    renderEditCodeListReference();
    expect(
      screen.getByText(textMock('ux_editor.options.codelist_referenceId.description')),
    ).toBeInTheDocument();
  });

  it('should render value when optionsId is set', () => {
    renderEditCodeListReference({
      componentProps: {
        optionsId: 'some-id',
      },
    });
    expect(screen.getByDisplayValue('some-id')).toBeInTheDocument();
  });

  it('should call handleComponentChange when input value changes', async () => {
    const handleComponentChange = jest.fn();
    renderEditCodeListReference({ handleComponentChange });
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
    renderEditCodeListReference({
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
