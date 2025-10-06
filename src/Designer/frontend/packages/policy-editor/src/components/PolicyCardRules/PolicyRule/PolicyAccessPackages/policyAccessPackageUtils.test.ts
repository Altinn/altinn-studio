import type { PolicyAccessPackageArea } from 'app-shared/types/PolicyAccessPackages';
import {
  filterAccessPackagesBySearchString,
  groupAccessPackagesByArea,
  flatMapAreaPackageList,
  isAccessPackageSelected,
  filterAccessPackagesByIsDelegable,
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
      isDelegable: true,
    },
    {
      id: 'package2',
      urn: 'urn:package2',
      name: 'Package Beta',
      description: 'Second package',
      isDelegable: true,
    },
    {
      id: 'package3',
      urn: 'urn:package3',
      name: 'Package Delta',
      description: 'Third non-delegable package',
      isDelegable: false,
    },
  ],
};

const eksplisittPackage = {
  id: 'c0eb20c1-2268-48f5-88c5-f26cb47a6b1f',
  name: 'Eksplisitt tjenestedelegering',
  urn: 'urn:altinn:accesspackage:eksplisitt',
  description:
    'Denne fullmakten er ikke delegerbar, og er ikke knyttet til noen roller i ENhetsregisteret. Tilgang til tjenester knyttet til denne pakken kan gis av Hovedadministrator gjennom enkeltrettighetsdelegering.',
  isDelegable: false,
};

const area2: PolicyAccessPackageArea = {
  id: 'area2',
  name: 'Area 2',
  urn: 'urn:area2',
  description: '',
  icon: '',
  packages: [
    {
      id: 'package4',
      urn: 'urn:package4',
      name: 'Package Gamma',
      description: 'Fourth package',
      isDelegable: true,
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

  describe('filterAccessPackagesByIsDelegable', () => {
    it('filters away non-delegable access packages', () => {
      const result = filterAccessPackagesByIsDelegable([area1]);
      expect(result).toEqual([{ ...area1, packages: [area1.packages[0], area1.packages[1]] }]);
    });

    it('should not filter urn:altinn:accesspackage:eksplisitt', () => {
      const result = filterAccessPackagesByIsDelegable([
        {
          ...area1,
          packages: [eksplisittPackage],
        },
      ]);
      expect(result).toEqual([{ ...area1, packages: [eksplisittPackage] }]);
    });
  });

  describe('flatMapAreaPackageList', () => {
    it('flattens packages from all areas into a single array', () => {
      const result = flatMapAreaPackageList(areas);
      expect(result).toEqual([
        area1.packages[0],
        area1.packages[1],
        area1.packages[2],
        area2.packages[0],
      ]);
    });
  });
});
