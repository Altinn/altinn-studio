import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTypeName);

  it('Returns the correct text if it exists', () => {
    expect(result.current(ComponentTypeV3.Input)).toBe(
      textMock(`ux_editor.component_title.${ComponentTypeV3.Input}`),
    );
    expect(result.current(ComponentTypeV3.Paragraph)).toBe(
      textMock(`ux_editor.component_title.${ComponentTypeV3.Paragraph}`),
    );
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentTypeV3.Header)).toBe(
      textMock(`ux_editor.component_title.${ComponentTypeV3.Header}`),
    );
    expect(result.current(ComponentTypeV3.Checkboxes)).toBe(
      textMock(`ux_editor.component_title.${ComponentTypeV3.Checkboxes}`),
    );
  });
});
