import type { IAltinnOrgs } from 'src/types/shared';

export function getOrgsMock(): IAltinnOrgs {
  return {
    mockOrg: {
      name: {
        en: 'Mock Ministry',
        nb: 'Mockdepartementet',
        nn: 'Mockdepartementet',
      },
      logo: 'https://altinncdn.no/orgs/mockOrg/mockOrg.png',
      orgnr: '',
      homepage: '',
      environments: ['tt02', 'production'],
    },
  };
}
