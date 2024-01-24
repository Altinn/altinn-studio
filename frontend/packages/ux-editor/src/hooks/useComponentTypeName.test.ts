import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHook } from '@testing-library/react';
import { useComponentTypeName } from './useComponentTypeName';

// Test data:
const inputText = 'input';
const paragraphText = 'paragraph';
const texts: KeyValuePairs<string> = {
  [`ux_editor.component_title.${ComponentType.Input}`]: inputText,
  [`ux_editor.component_title.${ComponentType.Paragraph}`]: paragraphText,
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
    expect(result.current(ComponentType.Input)).toBe(inputText);
    expect(result.current(ComponentType.Paragraph)).toBe(paragraphText);
  });

  it('Returns the component type if the text does not exist', () => {
    expect(result.current(ComponentType.Header)).toBe(ComponentType.Header);
    expect(result.current(ComponentType.Checkboxes)).toBe(ComponentType.Checkboxes);
  });
});
