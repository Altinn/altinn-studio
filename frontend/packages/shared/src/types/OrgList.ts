import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type Org = {
  name: KeyValuePairs<string>;
  logo: string;
  orgnr: string;
  homepage: string;
  environments: string[];
};

export type OrgList = {
  orgs: KeyValuePairs<Org>;
};
