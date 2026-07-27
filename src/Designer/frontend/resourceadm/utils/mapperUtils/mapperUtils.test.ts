import { setLastChangedAndSortResourceListByDate } from './mapperUtils';
import { LOCAL_RESOURCE_CHANGED_TIME } from '../resourceListUtils';

describe('mapperUtils', () => {
  describe('setLastChangedAndSortResourceListByDate', () => {
    it('should sort the list by date', () => {
      const resource1Id = 'resource-1';
      const resource2Id = 'resource-2';
      const resource3Id = 'resource-3';
      const resource4Id = 'resource-4';
      const loadedResourceList = [
        {
          title: { nb: resource1Id, en: '', nn: '' },
          createdBy: '',
          lastChanged: null,
          identifier: resource1Id,
          environments: ['tt02'],
        },
        {
          title: { nb: resource2Id, en: '', nn: '' },
          createdBy: '',
          lastChanged: null,
          identifier: resource2Id,
          environments: ['gitea'],
        },
        {
          title: { nb: resource3Id, en: '', nn: '' },
          createdBy: 'ulrik user',
          lastChanged: new Date('2023-08-29'),
          identifier: resource3Id,
          environments: ['gitea', 'tt02'],
        },
        {
          title: { nb: resource4Id, en: '', nn: '' },
          createdBy: 'ulrik user',
          lastChanged: new Date('2023-08-30'),
          identifier: resource4Id,
          environments: ['tt02', 'gitea'],
        },
      ];
      const resultResourceList = setLastChangedAndSortResourceListByDate(loadedResourceList);
      // Verify that Gitea resources with LOCAL_RESOURCE_CHANGED_TIME appear first
      expect(resultResourceList[0].identifier).toBe(resource2Id);
      // Verify that resources with actual dates are sorted in descending order
      expect(resultResourceList[1].identifier).toBe(resource4Id);
      expect(resultResourceList[2].identifier).toBe(resource3Id);
      // Verify that resources with null dates appear last
      expect(resultResourceList[3].identifier).toBe(resource1Id);
    });

    it('should set lastChanged to static value if lastChanged is null and environments includes gitea', () => {
      const loadedResourceList = [
        {
          title: { nb: 'resource-1', en: '', nn: '' },
          createdBy: '',
          lastChanged: null,
          identifier: 'resource-1',
          environments: ['gitea'],
        },
      ];
      const resultResourceList = setLastChangedAndSortResourceListByDate(loadedResourceList);
      expect(resultResourceList[0].lastChanged).toBe(LOCAL_RESOURCE_CHANGED_TIME);
    });

    it('should sort environments', () => {
      const loadedResourceList = [
        {
          title: { nb: 'resource-1', en: '', nn: '' },
          createdBy: '',
          lastChanged: null,
          identifier: 'resource-1',
          environments: ['gitea', 'at24', 'at22', 'prod', 'tt02'],
        },
      ];
      const resultResourceList = setLastChangedAndSortResourceListByDate(loadedResourceList);
      expect(resultResourceList[0].environments).toEqual(['prod', 'tt02', 'at22', 'at24', 'gitea']);
    });
  });
});
