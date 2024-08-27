import { renderParty } from 'src/utils/party';
import type { IParty, IPerson, IProfile } from 'src/types/shared';

describe('party', () => {
  const mockProfile = {
    error: null,
    profile: {
      party: {
        person: {
          firstName: 'Ola',
          middleName: null,
          lastName: 'Privatperson',
        } as unknown as IPerson,
        organization: null,
      } as unknown as IParty,
    } as unknown as IProfile,
  };

  it('should return party as uppercase person', () => {
    const result = renderParty(mockProfile.profile);
    expect(result).toEqual('OLA PRIVATPERSON');
  });

  it('should return party as uppercase person with middle name', () => {
    mockProfile.profile.party!.person!.middleName = 'NOE';

    const result = renderParty(mockProfile.profile);
    expect(result).toEqual('OLA NOE PRIVATPERSON');
  });

  it('should return party null if no person', () => {
    const mockProfileCopy = {
      ...mockProfile,
      profile: {
        ...mockProfile.profile,
        party: { ...mockProfile.profile.party, person: null, organization: null },
      } as unknown as IProfile,
    };

    const result = renderParty(mockProfileCopy.profile);
    expect(result).toEqual(null);
  });
});
