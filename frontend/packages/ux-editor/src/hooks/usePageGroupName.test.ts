import { renderHookWithProviders } from '../testing/mocks';
import { usePageGroupName } from './usePageGroupName';

describe('usePageGroupName', () => {
  it('should return the group name if it exists', () => {
    const { result } = renderUsePageGroupName();
    const groupName = result.current({
      name: 'Group 1',
      order: [{ id: 'page1' }, { id: 'page2' }],
    });
    expect(groupName).toBe('Group 1');
  });

  it('should return name of page if group has only one page', () => {
    const { result } = renderUsePageGroupName();
    const groupName = result.current({
      order: [{ id: 'page1' }],
    });
    expect(groupName).toBe('page1');
  });
});

const renderUsePageGroupName = () => {
  return renderHookWithProviders(() => usePageGroupName());
};
