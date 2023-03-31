import { renderParty } from 'src/utils/party';

describe('party', () => {
  let mockProfile: any;
  beforeEach(() => {
    mockProfile = {
      error: null,
      profile: {
        party: {
          person: {
            firstName: 'Ola',
            middleName: null,
            lastName: 'Privatperson',
          },
          organisation: null,
        },
      },
    };
  });

  it('should return party as uppercase person', () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual('OLA PRIVATPERSON');
  });
  it('should return party as uppercase person with middlename', () => {
    mockProfile.profile.party.person.middleName = 'NOE';
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual('OLA NOE PRIVATPERSON');
  });
  it('should return party as null if no person', () => {
    mockProfile = {
      error: null,
      profile: {
        party: {
          organisation: null,
        },
      },
    };
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual(null);
  });
});
