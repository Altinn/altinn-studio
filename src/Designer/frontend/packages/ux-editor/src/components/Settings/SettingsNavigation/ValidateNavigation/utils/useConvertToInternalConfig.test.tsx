import { useConvertToInternalConfig } from './useConvertToInternalConfig';

jest.mock('@altinn/ux-editor/hooks', () => ({
  useComponentPropertyEnumValue: () => (value: string) => value,
}));

describe('useConvertToInternalConfig', () => {
  it('should return undefined when externalConfig is undefined', () => {
    const result = useConvertToInternalConfig(undefined);
    expect(result).toBeUndefined();
  });

  it('should convert externalConfig to internalConfig correctly', () => {
    const externalConfig = {
      show: ['type1', 'type2'],
      page: 'current',
      tasks: ['task1'],
      task: 'task2',
      pages: ['page1', 'page2'],
    };
    const result = useConvertToInternalConfig(externalConfig);
    expect(result).toEqual({
      types: [
        { value: 'type1', label: 'type1' },
        { value: 'type2', label: 'type2' },
      ],
      pageScope: { value: 'current', label: 'current' },
      tasks: [{ value: 'task1', label: 'task1' }],
      task: { value: 'task2', label: 'task2' },
      pages: [
        { value: 'page1', label: 'page1' },
        { value: 'page2', label: 'page2' },
      ],
    });
  });
});
