import { ComponentType, InternalComponentType } from 'app-shared/types/ComponentType';
import { renderHook } from '@testing-library/react';
import { useComponentTitle } from './useComponentTitle';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { componentMocks } from '../testing/componentMocks';

// Test data:
const inputText = textMock(`ux_editor.component_title.${ComponentType.Input}`);
const paragraphText = textMock(`ux_editor.component_title.${ComponentType.Paragraph}`);
const headerText = textMock(`ux_editor.component_title.${ComponentType.Header}`);
const checkboxesText = textMock(`ux_editor.component_title.${ComponentType.Checkboxes}`);
const customButtonText = textMock(`ux_editor.component_title.${ComponentType.CustomButton}`);
const closeSubformButtonText = textMock(
  `ux_editor.component_title.${InternalComponentType.CloseSubformButton}`,
);

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTitle);

  it('Returns the correct text if it exists', () => {
    expect(result.current(componentMocks[ComponentType.Input])).toBe(inputText);
    expect(result.current(componentMocks[ComponentType.Paragraph])).toBe(paragraphText);
    expect(result.current(componentMocks[ComponentType.CustomButton])).toBe(customButtonText);
    expect(result.current(componentMocks[InternalComponentType.CloseSubformButton])).toBe(
      closeSubformButtonText,
    );
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(componentMocks[ComponentType.Header])).toBe(headerText);
    expect(result.current(componentMocks[ComponentType.Checkboxes])).toBe(checkboxesText);
  });
});
