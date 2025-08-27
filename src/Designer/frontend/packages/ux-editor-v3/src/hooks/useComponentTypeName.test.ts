import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data:
const inputText = textMock(`ux_editor.component_title.${ComponentTypeV3.Input}`);
const paragraphText = textMock(`ux_editor.component_title.${ComponentTypeV3.Paragraph}`);
const headerText = textMock(`ux_editor.component_title.${ComponentTypeV3.Header}`);
const checkboxesText = textMock(`ux_editor.component_title.${ComponentTypeV3.Checkboxes}`);

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTypeName);

  it('Returns the correct text if it exists', () => {
    expect(result.current(ComponentTypeV3.Input)).toBe(inputText);
    expect(result.current(ComponentTypeV3.Paragraph)).toBe(paragraphText);
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentTypeV3.Header)).toBe(headerText);
    expect(result.current(ComponentTypeV3.Checkboxes)).toBe(checkboxesText);
  });
});
