import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { UndefinedBinding, type UndefinedBindingProps } from './UndefinedBinding';
import { textMock } from '@studio/testing/mocks/i18nMock';

const label = 'kort svar';
const dataModelField = 'field';

const defaultUndefinedBinding: UndefinedBindingProps = {
  label,
  onClick: jest.fn(),
};

const renderUndefinedBinding = (props: UndefinedBindingProps = defaultUndefinedBinding) => {
  render(<UndefinedBinding {...props} />);
};

describe('UndefinedBinding', () => {
  it('should render edit button with only link icon and label', () => {
    renderUndefinedBinding();

    const editButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_field_choose_for', {
        componentName: label,
      }),
    });
    expect(editButton).toBeInTheDocument();

    const icon = within(editButton).getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();

    expect(screen.queryByText(dataModelField)).not.toBeInTheDocument();
  });
});
