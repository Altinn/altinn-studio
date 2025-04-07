import type { PolicyAccessPackageArea } from 'app-shared/types/PolicyAccessPackages';
import {
  filterAccessPackagesBySearchString,
  filterAccessPackagesById,
  groupAccessPackagesByArea,
  flatMapAreaPackageList,
  isAccessPackageSelected,
} from './policyAccessPackageUtils';

const area1: PolicyAccessPackageArea = {
  id: 'area1',
  name: 'Area 1',
  urn: 'urn:area1',
  description: '',
  icon: '',
  packages: [
    {
      id: 'package1',
      urn: 'urn:package1',
      name: 'Package Alpha',
      description: 'First package',
    },
    {
      id: 'package2',
      urn: 'urn:package2',
      name: 'Package Beta',
      description: 'Second package',
    },
  ],
};

const area2: PolicyAccessPackageArea = {
  id: 'area2',
  name: 'Area 2',
  urn: 'urn:area2',
  description: '',
  icon: '',
  packages: [
    {
      id: 'package3',
      urn: 'urn:package3',
      name: 'Package Gamma',
      description: 'Third package',
    },
  ],
};

const areas = [area1, area2];

describe('policyAccessPackageUtils', () => {
  describe('isAccessPackageSelected', () => {
    it('returns true if the access package URN is in the list', () => {
      expect(isAccessPackageSelected('urn:package1', ['urn:package1', 'urn:package2'])).toBe(true);
    });

    it('returns false if the access package URN is not in the list', () => {
      expect(isAccessPackageSelected('urn:package3', ['urn:package1', 'urn:package2'])).toBe(false);
    });
  });

  describe('filterAccessPackagesById', () => {
    const accessPackages = [
      { id: 'package1', urn: 'urn:package1', name: 'Package 1', description: '' },
      { id: 'package2', urn: 'urn:package2', name: 'Package 2', description: '' },
    ];

    it('filters access packages by chosen URNs', () => {
      const result = filterAccessPackagesById(accessPackages, ['urn:package1']);
      expect(result).toEqual([accessPackages[0]]);
    });

    it('returns an empty array if no URNs match', () => {
      const result = filterAccessPackagesById(accessPackages, ['urn:package3']);
      expect(result).toEqual([]);
    });
  });

  describe('filterAccessPackagesBySearchString', () => {
    it('filters packages by search string matching name or description', () => {
      const result = filterAccessPackagesBySearchString(areas, 'Alpha');
      expect(result).toEqual([
        {
          ...area1,
          packages: [area1.packages[0]],
        },
      ]);
    });

    it('returns all areas if search string is empty', () => {
      const result = filterAccessPackagesBySearchString(areas, '');
      expect(result).toEqual(areas);
    });

    it('returns an empty array if no packages match', () => {
      const result = filterAccessPackagesBySearchString(areas, 'Nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('groupAccessPackagesByArea', () => {
    const groups = [
      {
        id: 'group1',
        name: 'Area 1',
        urn: 'urn:group1',
        description: '',
        type: '',
        areas: [area1],
      },
      {
        id: 'group2',
        name: 'Area 2',
        urn: 'urn:group2',
        description: '',
        type: '',
        areas: [area2],
      },
    ];

    it('groups areas from all area groups', () => {
      const result = groupAccessPackagesByArea(groups);
      expect(result).toEqual([area1, area2]);
    });
  });

  describe('flatMapAreaPackageList', () => {
    it('flattens packages from all areas into a single array', () => {
      const result = flatMapAreaPackageList(areas);
      expect(result).toEqual([area1.packages[0], area1.packages[1], area2.packages[0]]);
    });
  });
});
