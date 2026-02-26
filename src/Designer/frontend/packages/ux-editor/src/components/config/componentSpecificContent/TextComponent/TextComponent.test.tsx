import React from 'react';
import { TextComponent, type TextComponentProps } from './TextComponent';
import { renderWithProviders } from '../../../../testing/mocks';
import { componentMocks } from '../../../../../../ux-editor/src/testing/componentMocks';
import { screen } from '@testing-library/react';
import { DataLookupFuncName, type StringExpression } from '@studio/components';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const { Text: textComponent } = componentMocks;
const expressionValue: StringExpression = [DataLookupFuncName.DataModel, 'hello', 'world'];

describe('TextComponent', () => {
  const openEditMode = async () => {
    const user = userEvent.setup();
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.value'),
    });
    await user.click(button);
  };

  it('should render display value when not in edit mode', () => {
    renderTextComponent({ component: { ...textComponent, value: expressionValue } });
    const displayValue = screen.getByText(expressionValue.join(', '));
    expect(displayValue).toBeInTheDocument();
  });

  it('should render StudioManualExpression when in edit mode', async () => {
    renderTextComponent();
    await openEditMode();
    const manualExpression = screen.getByRole('textbox');
    expect(manualExpression).toBeInTheDocument();
  });

  it('should call handleComponentChange with updated value when saving', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderTextComponent({ handleComponentChange });
    await openEditMode();

    const manualExpression = screen.getByRole('textbox');
    await user.clear(manualExpression);
    await user.paste(JSON.stringify(expressionValue));

    const saveButton = screen.getByRole('button', {
      name: textMock('general.save'),
    });
    await user.click(saveButton);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: expressionValue }),
    );
  });

  it('should close edit mode and not save value when cancel', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderTextComponent({ handleComponentChange });
    await openEditMode();

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(cancelButton);

    const displayValue = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.value'),
    });
    expect(displayValue).toBeInTheDocument();
    expect(handleComponentChange).not.toHaveBeenCalled();
  });

  it('should clear value when delete is clicked', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderTextComponent({
      component: { ...textComponent, value: expressionValue },
      handleComponentChange,
    });
    await openEditMode();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);
    expect(handleComponentChange).toHaveBeenCalledWith(expect.objectContaining({ value: '' }));
  });
});

const renderTextComponent = (props: Partial<TextComponentProps> = {}) => {
  const defaultProps: TextComponentProps = {
    component: {
      ...textComponent,
      ...props.component,
    },
    handleComponentChange: jest.fn(),
  };

  const combinedProps = { ...defaultProps, ...props };
  return renderWithProviders(<TextComponent {...combinedProps} />);
};
