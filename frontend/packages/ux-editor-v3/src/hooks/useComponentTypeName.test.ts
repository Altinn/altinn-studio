import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';

// Test data:
const inputText = 'input';
const paragraphText = 'paragraph';
const texts: KeyValuePairs<string> = {
  [`ux_editor.component_title.${ComponentTypeV3.Input}`]: inputText,
  [`ux_editor.component_title.${ComponentTypeV3.Paragraph}`]: paragraphText,
};

// Mocks:
jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string) => texts?.[key] ?? key,
  }),
}));

describe('useComponentTypeName', () => {
  const { result } = renderHook(useComponentTypeName);

  it('Returns the correct text if it exists', () => {
    expect(result.current(ComponentTypeV3.Input)).toBe(inputText);
    expect(result.current(ComponentTypeV3.Paragraph)).toBe(paragraphText);
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentTypeV3.Header)).toBe(ComponentTypeV3.Header);
    expect(result.current(ComponentTypeV3.Checkboxes)).toBe(ComponentTypeV3.Checkboxes);
  });
});
