import { flattenParties, reduceToValidParties } from 'src/features/party/partyProviderUtils';
import { PartyType } from 'src/types/shared';
import type { IPartyTypesAllowed } from 'src/features/applicationMetadata/types';
import type { IParty } from 'src/types/shared';

const setupParties = (): IParty[] => [
  {
    partyTypeName: PartyType.Organisation,
    name: 'Party1',
    partyId: 1,
    ssn: null,
    isDeleted: false,
    onlyHierarchyElementWithNoAccess: false,
    childParties: [
      {
        partyTypeName: PartyType.SubUnit,
        name: 'ChildParty1',
        partyId: 2,
        ssn: null,
        isDeleted: false,
        onlyHierarchyElementWithNoAccess: false,
      },
    ],
  },
  {
    partyTypeName: PartyType.Person,
    name: 'Party2',
    partyId: 3,
    ssn: null,
    isDeleted: false,
    onlyHierarchyElementWithNoAccess: false,
  },
];

describe('flattenParties', () => {
  it('should flatten nested parties correctly', () => {
    const parties = setupParties();

    const expectedOutput: IParty[] = [
      {
        isDeleted: false,
        name: 'Party2',
        onlyHierarchyElementWithNoAccess: false,
        partyId: 3,
        partyTypeName: 1,
        ssn: null,
      },
      {
        childParties: [
          {
            isDeleted: false,
            name: 'ChildParty1',
            onlyHierarchyElementWithNoAccess: false,
            partyId: 2,
            partyTypeName: 4,
            ssn: null,
          },
        ],
        isDeleted: false,
        name: 'Party1',
        onlyHierarchyElementWithNoAccess: false,
        partyId: 1,
        partyTypeName: 2,
        ssn: null,
      },
      {
        isDeleted: false,
        name: 'ChildParty1',
        onlyHierarchyElementWithNoAccess: false,
        partyId: 2,
        partyTypeName: 4,
        ssn: null,
      },
    ];

    const result = flattenParties(parties);
    expect(result.length).toBe(3);
    expect(result).toEqual(expect.arrayContaining(expectedOutput));
  });
});

describe('getValidParties', () => {
  it('should return all parties if non are allowed', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: false,
      subUnit: false,
      person: false,
      bankruptcyEstate: false,
    };

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(3);
    expect(result).toEqual(expect.arrayContaining(parties));
  });

  it('should return all parties if all party types are allowed', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: true,
      subUnit: true,
      person: true,
      bankruptcyEstate: true,
    };

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(3);
    expect(result).toEqual(expect.arrayContaining(parties));
  });

  it('should return only parties that are allowed by app metadata', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: true,
      subUnit: false,
      person: false,
      bankruptcyEstate: false,
    };

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(1);
    expect(result).toEqual(expect.arrayContaining([parties[0]]));
  });

  it('should return only parties that are allowed by app metadata and with access', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: true,
      subUnit: false,
      person: true,
      bankruptcyEstate: false,
    };

    parties[1].onlyHierarchyElementWithNoAccess = true;

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(1);
    expect(result).toEqual(expect.arrayContaining([parties[0]]));
  });
  it('should return only parties that are allowed by app metadata and not deleted', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: true,
      subUnit: false,
      person: true,
      bankruptcyEstate: false,
    };

    parties[1].isDeleted = true;

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(1);
    expect(result).toEqual(expect.arrayContaining([parties[0]]));
  });

  it('should return only parties that are allowed by app metadata', () => {
    const parties = setupParties();
    const partyTypesAllowed: IPartyTypesAllowed = {
      organisation: false,
      subUnit: true,
      person: false,
      bankruptcyEstate: false,
    };

    const result = reduceToValidParties(parties, partyTypesAllowed);
    expect(result.length).toBe(1);
    expect(result).toEqual(expect.arrayContaining([parties[0].childParties![0]]));
  });
});
