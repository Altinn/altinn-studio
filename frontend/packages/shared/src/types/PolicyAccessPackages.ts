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
  packages: PolicyAccessPackage[];
};

export type PolicyAccessPackageAreaGroup = {
  id: string;
  name: string;
  description: string;
  type: string;
  areas: PolicyAccessPackageArea[];
};

type AccessPackageResourceLanguage = 'nb' | 'nn' | 'en';

type CompetentAuthority = {
  name: Record<AccessPackageResourceLanguage, string>;
  organization: string;
  orgcode: string;
};

export type AccessPackageResource = {
  identifier: string;
  title: Record<AccessPackageResourceLanguage, string>;
  hasCompetentAuthority?: CompetentAuthority;
  logoUrl: string;
};
