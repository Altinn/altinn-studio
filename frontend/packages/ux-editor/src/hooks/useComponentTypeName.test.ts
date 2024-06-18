import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data:
const inputText = textMock(`ux_editor.component_title.${ComponentType.Input}`);
const paragraphText = textMock(`ux_editor.component_title.${ComponentType.Paragraph}`);
const headerText = textMock(`ux_editor.component_title.${ComponentType.Header}`);
const checkboxesText = textMock(`ux_editor.component_title.${ComponentType.Checkboxes}`);

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTypeName);

  it('Returns the correct text if it exists', () => {
    expect(result.current(ComponentType.Input)).toBe(inputText);
    expect(result.current(ComponentType.Paragraph)).toBe(paragraphText);
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentType.Header)).toBe(headerText);
    expect(result.current(ComponentType.Checkboxes)).toBe(checkboxesText);
  });
});
