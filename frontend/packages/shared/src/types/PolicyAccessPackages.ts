export type PolicyAccessPackage = {
  id: string;
  urn: string;
  name: string;
  description: string;
};

export type PolicyAccessPackageArea = {
  id: string;
  urn: string;
  name: string;
  description: string;
  icon: string;
  areaGroup: string;
  packages: PolicyAccessPackage[];
};

export type PolicyAccessPackageAreaGroup = {
  id: string;
  urn: string;
  name: string;
  description: string;
  type: string;
  areas: PolicyAccessPackageArea[];
};

type AccessPackageResourceLanguage = 'nb' | 'nn' | 'en';

type CompetentAuthority = {
  name: AccessPackageResourceLanguage;
  organization: string;
  orgcode: string;
};

export type AccessPackageResource = {
  identifier: string;
  title: AccessPackageResourceLanguage;
  hasCompetentAuthority?: CompetentAuthority;
  logoUrl: string;
};
