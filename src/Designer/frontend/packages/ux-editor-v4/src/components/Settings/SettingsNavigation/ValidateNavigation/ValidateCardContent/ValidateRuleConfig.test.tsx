import { screen, waitFor } from '@testing-library/react';
import { renderAndRunTimers } from '@studio/ui-test';
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
  it('uses the existing empty scope value when the selection is cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const label = textMock('ux_editor.component_properties.enum_current');
    renderValidateRuleConfig({ selectedPageScope: { value: 'current', label }, onChange });
    const input = screen.getByLabelText(textMock('ux_editor.settings.navigation_validation_scope'));
    await user.click(input);
    await waitFor(() => expect(input).toHaveValue(label));

    await user.clear(input);
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({ pageScope: { value: '', label: '' } });
  });
});

const renderValidateRuleConfig = (props: Partial<ValidateRuleConfigProps> = {}) => {
  const defaultProps: ValidateRuleConfigProps = {
    selectedTypes: [],
    selectedPageScope: { value: '', label: '' },
    onChange: jest.fn(),
  };
  return renderAndRunTimers(<ValidateRuleConfig {...defaultProps} {...props} />);
};
