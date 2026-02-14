import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidateRuleConfig, type ValidateRuleConfigProps } from './ValidateRuleConfig';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('ValidateRuleConfig', () => {
  it('should call onChange with correct values when types are changed', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderValidateRuleConfig({ onChange: mockOnChange });

    const typeSelector = screen.getByRole('textbox', {
      name: textMock('ux_editor.settings.navigation_validation_type_label'),
    });
    await user.click(typeSelector);
    const schemaOptionLabel = textMock('ux_editor.component_properties.enum_Schema');
    const option = await screen.findByRole('option', { name: schemaOptionLabel });
    await user.click(option);

    expect(mockOnChange).toHaveBeenCalledWith({
      types: [{ label: schemaOptionLabel, value: 'Schema' }],
    });
  });

  it('should call onChange with correct value when pageScope is changed', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderValidateRuleConfig({ onChange: mockOnChange });
    const select = screen.getByRole('combobox', {
      name: textMock('ux_editor.settings.navigation_validation_scope'),
    });
    await user.selectOptions(select, 'current');
    expect(mockOnChange).toHaveBeenCalledWith({ pageScope: 'current' });
  });
});

const renderValidateRuleConfig = (props: Partial<ValidateRuleConfigProps> = {}) => {
  const defaultProps: ValidateRuleConfigProps = {
    types: [],
    pageScope: '',
    onChange: jest.fn(),
  };
  return render(<ValidateRuleConfig {...defaultProps} {...props} />);
};
