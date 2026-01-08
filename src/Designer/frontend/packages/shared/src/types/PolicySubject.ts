export interface PolicySubject {
  id: string;
  name: string;
  description: string;
  urn: string;
  code?: string;
  legacyRoleCode?: string;
  legacyUrn?: string;
  provider: {
    id: string;
    name: string;
    code: string;
  };
}
