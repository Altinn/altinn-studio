import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import { canToggleRequired } from './componentUtils';

describe('canToggleRequired', () => {
  it('is true for a field that is required, optional or not set', () => {
    expect(canToggleRequired({ id: 'a', type: ComponentType.Input })).toBe(true);
    expect(canToggleRequired({ id: 'a', type: ComponentType.Input, required: true })).toBe(true);
    expect(canToggleRequired({ id: 'a', type: ComponentType.TextArea, required: false })).toBe(
      true,
    );
  });

  it('is false when required is an expression', () => {
    const required = ['equals', ['dataModel', 'hasChildren'], true];
    expect(canToggleRequired({ id: 'a', type: ComponentType.Input, required })).toBe(false);
  });

  it('is false for components that are not fields', () => {
    expect(canToggleRequired({ id: 'a', type: ComponentType.Heading })).toBe(false);
  });
});
