import { renderHook, act } from '@testing-library/react';
import { useConfigProperty } from './useConfigProperty';
import { useComponentPropertyLabel } from '../../../hooks';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

jest.mock('../../../hooks', () => ({ useComponentPropertyLabel: jest.fn() }));

describe('useConfigProperty', () => {
  const propertyKey = 'size';
  const initialComponent = componentMocks[ComponentType.Heading];

  it('should initialize property values and label correctly', () => {
    (useComponentPropertyLabel as jest.Mock).mockReturnValue(
      (key: string) => `ux_editor.component_properties.${key}`,
    );

    const { result } = renderHook(() => useConfigProperty({ initialComponent, propertyKey }));

    expect(result.current.initialPropertyValue).toBe('M');
    expect(result.current.currentPropertyValue).toBe('M');
    expect(result.current.currentComponent).toEqual(initialComponent);
    expect(result.current.propertyLabel).toBe(`ux_editor.component_properties.${propertyKey}`);
  });

  it('should update property value and current component when handleComponentChange is called', () => {
    const updatedComponent = { ...initialComponent, [propertyKey]: 'L' as const };

    (useComponentPropertyLabel as jest.Mock).mockReturnValue((key: string) => key);

    const { result } = renderHook(() => useConfigProperty({ initialComponent, propertyKey }));

    act(() => {
      result.current.handleComponentChange(updatedComponent);
    });

    expect(result.current.currentPropertyValue).toBe('L');
    expect(result.current.currentComponent).toEqual(updatedComponent);
  });
});
