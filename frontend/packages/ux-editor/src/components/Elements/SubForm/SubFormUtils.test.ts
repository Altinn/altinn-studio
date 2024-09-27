import { SubFormUtils } from './SubFormUtils';
import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

describe('SubFormUtils', () => {
  const layoutSets: Array<LayoutSet> = [
    { id: '1', type: 'form' },
    { id: '2', type: 'subform' },
    { id: '3', type: 'custom' },
  ];

  it('should return the layout set when it is a subform', () => {
    const result = SubFormUtils.findSubFormById(layoutSets, '2');
    expect(result).toEqual({ id: '2', type: 'subform' });
  });

  it('should return null when the layout set is not a subform', () => {
    const result = SubFormUtils.findSubFormById(layoutSets, '1');
    expect(result).toBeNull();
  });

  it('should return null when the layout set is not found', () => {
    const result = SubFormUtils.findSubFormById(layoutSets, 'non-existent-id');
    expect(result).toBeNull();
  });
});
