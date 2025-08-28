import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
  PolicyAccessPackageAreaGroup,
} from 'app-shared/types/PolicyAccessPackages';

const isStringMatch = (matchString: string, searchString: string): boolean => {
  return matchString.toLowerCase().includes(searchString.toLowerCase());
};

const filterAreaPackagesBySearchString = (
  area: PolicyAccessPackageArea,
  searchString: string,
): PolicyAccessPackage[] => {
  return area.packages.filter(
    (pack) =>
      !searchString ||
      isStringMatch(pack.name, searchString) ||
      isStringMatch(pack.description, searchString),
  );
};

export const filterAccessPackagesBySearchString = (
  accessPackageAreas: PolicyAccessPackageArea[],
  searchString: string,
): PolicyAccessPackageArea[] => {
  return accessPackageAreas.reduce(
    (areas: PolicyAccessPackageArea[], area): PolicyAccessPackageArea[] => {
      const matchingPackages = filterAreaPackagesBySearchString(area, searchString);
      if (matchingPackages.length > 0) {
        return [...areas, { ...area, packages: matchingPackages }];
      }
      return areas;
    },
    [],
  );
};

export const groupAccessPackagesByArea = (
  accessPackageAreaGroups: PolicyAccessPackageAreaGroup[],
): PolicyAccessPackageArea[] => {
  return accessPackageAreaGroups.flatMap((group: PolicyAccessPackageAreaGroup) => group.areas);
};

export const filterAccessPackagesByIsDelegable = (
  areas: PolicyAccessPackageArea[],
): PolicyAccessPackageArea[] => {
  return areas.map((area) => {
    return {
      ...area,
      packages: area.packages.filter((accessPackage) => accessPackage.isDelegable),
    };
  });
};

export const flatMapAreaPackageList = (
  areaList: PolicyAccessPackageArea[],
): PolicyAccessPackage[] => {
  return areaList.flatMap((area: PolicyAccessPackageArea) => area.packages);
};

export const isAccessPackageSelected = (
  accessPackageUrn: string,
  chosenAccessPackageUrns: string[],
): boolean => {
  return chosenAccessPackageUrns.includes(accessPackageUrn);
};
