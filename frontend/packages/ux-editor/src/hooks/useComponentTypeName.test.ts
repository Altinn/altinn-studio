import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTypeName);

  it('Returns the correct text if it exists', () => {
    expect(result.current(ComponentType.Input)).toBe(
      textMock(`ux_editor.component_title.${ComponentType.Input}`),
    );
    expect(result.current(ComponentType.Paragraph)).toBe(
      textMock(`ux_editor.component_title.${ComponentType.Paragraph}`),
    );
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentType.Header)).toBe(
      textMock(`ux_editor.component_title.${ComponentType.Header}`),
    );
    expect(result.current(ComponentType.Checkboxes)).toBe(
      textMock(`ux_editor.component_title.${ComponentType.Checkboxes}`),
    );
  });
});
