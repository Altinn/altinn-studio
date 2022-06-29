import { renderParty } from './party';

describe('sharedResources/utils/party', () => {
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
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual('OLA PRIVATPERSON');
  });
  it('should return party as uppercase person with middlename', () => {
    mockProfile.profile.party.person.middleName = 'NOE';
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
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual(null);
  });
});
