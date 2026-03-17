import React from 'react';
import { render } from '@testing-library/react';
import { ValidateRuleConfig, type ValidateRuleConfigProps } from './ValidateRuleConfig';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { selectSuggestionOption } from '../utils/ValidateNavigationTestUtils';

describe('ValidateRuleConfig', () => {
  it('should call onChange with correct values when types are changed', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderValidateRuleConfig({ onChange: mockOnChange });

    const selectorLabel = textMock('ux_editor.settings.navigation_validation_type_label');
    const optionLabel = textMock('ux_editor.component_properties.enum_Schema');
    await selectSuggestionOption({ user, selectorLabel, optionLabel });

    expect(mockOnChange).toHaveBeenCalledWith({ types: [{ label: optionLabel, value: 'Schema' }] });
  });
});

const renderValidateRuleConfig = (props: Partial<ValidateRuleConfigProps> = {}) => {
  const defaultProps: ValidateRuleConfigProps = {
    selectedTypes: [],
    selectedPageScope: null,
    onChange: jest.fn(),
  };
  return render(<ValidateRuleConfig {...defaultProps} {...props} />);
};
