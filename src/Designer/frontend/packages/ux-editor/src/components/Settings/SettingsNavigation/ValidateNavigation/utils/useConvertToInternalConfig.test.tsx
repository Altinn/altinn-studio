import { renderHook } from '@testing-library/react';
import { useConvertToInternalConfig } from './useConvertToInternalConfig';

jest.mock('@altinn/ux-editor/hooks', () => ({
  useComponentPropertyEnumValue: () => (value: string) => value,
}));

const show = ['type1', 'type2'];
const page = 'current';
const tasks = ['task1'];
const task = 'task2';
const pages = ['page1', 'page2'];

describe('useConvertToInternalConfig', () => {
  it('should return undefined when externalConfig is undefined', () => {
    const { result } = renderHook(() => useConvertToInternalConfig(undefined));
    expect(result.current).toBeUndefined();
  });

  it('should convert externalConfig to internalConfig correctly', () => {
    const externalConfig = {
      show,
      page,
      tasks,
      task,
      pages,
    };

    const { result } = renderHook(() => useConvertToInternalConfig(externalConfig));

    expect(result.current).toEqual({
      types: [
        { value: show[0], label: show[0] },
        { value: show[1], label: show[1] },
      ],
      pageScope: { value: page, label: page },
      tasks: [{ value: tasks[0], label: tasks[0] }],
      task: { value: task, label: task },
      pages: [
        { value: pages[0], label: pages[0] },
        { value: pages[1], label: pages[1] },
      ],
    });
  });
});
