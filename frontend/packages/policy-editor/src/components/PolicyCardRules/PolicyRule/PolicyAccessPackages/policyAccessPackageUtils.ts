import type { PolicyAccessPackageArea, PolicyAccessPackageAreaGroup } from '@altinn/policy-editor';

const isStringMatch = (matchString: string, searchString: string) => {
  return matchString.toLowerCase().includes(searchString.toLowerCase());
};

export const filterAccessPackagesBySearchString = (
  accessPackageAreas: PolicyAccessPackageArea[],
  searchString: string,
) => {
  return accessPackageAreas.reduce(
    (areas: PolicyAccessPackageArea[], area): PolicyAccessPackageArea[] => {
      const matchingPackages = area.packages.filter(
        (pack) =>
          !searchString ||
          isStringMatch(pack.name, searchString) ||
          isStringMatch(pack.description, searchString),
      );
      const returnAreas = [...areas];
      if (matchingPackages.length > 0) {
        returnAreas.push({ ...area, packages: matchingPackages });
      }
      return returnAreas;
    },
    [],
  );
};

export const groupAccessPackagesByArea = (
  accessPackageAreaGroups: PolicyAccessPackageAreaGroup[],
) => {
  return accessPackageAreaGroups.flatMap((group) => group.areas);
};
