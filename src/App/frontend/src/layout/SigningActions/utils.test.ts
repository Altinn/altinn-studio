import { NotificationStatus, SigneeState } from 'src/layout/SigneeList/api';
import { type CurrentUserStatus, getCurrentUserStatus } from 'src/layout/SigningActions/utils';

describe('getCurrentUserStatus', () => {
  // Mock data for signees
  const signedSignee = {
    name: 'John Doe',
    organization: 'Organization A',
    signedTime: new Date().toISOString(),
    hasSigned: true,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId: 123,
  };

  const unsignedOrgSignee = {
    name: null,
    organization: 'Organization B',
    signedTime: null,
    hasSigned: false,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId: 456,
  };

  const signedOrgSignee = {
    name: 'Jane Smith',
    organization: 'Organization C',
    signedTime: new Date().toISOString(),
    hasSigned: true,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId: 457,
  };

  const currentUserSignee = {
    name: 'Current User',
    organization: null,
    signedTime: null,
    hasSigned: false,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId: 789,
  };

  describe('getCurrentUserStatus', () => {
    it('should return "notSigning" when user does not have permission to sign', () => {
      const currentUserPartyId = 789;
      const userSignees = [currentUserSignee, unsignedOrgSignee];
      const canSign = false;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      expect(result).toBe('notSigning');
    });

    it('should return "awaitingSignature" when the current user is not in the signee list, but has permission to sign', () => {
      const currentUserPartyId = 999; // Not in the list
      const userSignees = [unsignedOrgSignee, signedSignee];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      expect(result).toBe('awaitingSignature');
    });

    it('should return "awaitingSignature" if userSignees array is empty, but the current user has permission to sign', () => {
      const currentUserPartyId = 789;
      const userSignees: SigneeState[] = []; // Empty array
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      expect(result).toBe('awaitingSignature');
    });

    it('should return "awaitingSignature" if any signee has not signed', () => {
      const currentUserPartyId = 789;
      const userSignees = [{ ...currentUserSignee, partyId: 789 }, unsignedOrgSignee, signedSignee];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      expect(result).toBe('awaitingSignature');
    });

    it('should return "signed" if all signees have signed and the current user (person) is in the signed list', () => {
      const userSignees = [
        { ...currentUserSignee, hasSigned: true, signedTime: new Date().toISOString() },
        { ...unsignedOrgSignee, hasSigned: true, signedTime: new Date().toISOString() },
        signedSignee,
      ];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserSignee.partyId, userSignees, canSign);

      expect(result).toBe('signed');
    });

    it('should handle undefined currentUserPartyId correctly', () => {
      const currentUserPartyId = undefined;
      const userSignees = [unsignedOrgSignee, signedSignee];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      // Since the user is not in the list (partyId is undefined) and they can sign, it should return 'awaitingSignature'
      expect(result).toBe('awaitingSignature');
    });

    it('should handle a mix of signed and unsigned signees correctly', () => {
      const currentUserPartyId = 789;
      const userSignees = [{ ...currentUserSignee, partyId: 789 }, signedSignee, unsignedOrgSignee];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      // Since there's at least one unsigned signee, it should return 'awaitingSignature'
      expect(result).toBe('awaitingSignature');
    });

    it('should return "awaitingSignature" if the current user is not in the list, but has signed for other orgs', () => {
      const currentUserPartyId = 789; // Not in the list
      const userSignees = [
        { organization: 'Org 1', partyId: 'org1', hasSigned: true },
        { organization: 'Org 2', partyId: 'org2', hasSigned: true },
      ] as unknown as SigneeState[];
      const canSign = true;

      const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);

      expect(result).toBe('awaitingSignature');
    });
  });

  describe('comprehensive test matrix', () => {
    const testCases: {
      description: string;
      currentUserPartyId: number | undefined;
      userSignees: SigneeState[];
      canSign: boolean;
      expected: CurrentUserStatus;
    }[] = [
      {
        description: 'User cannot sign',
        currentUserPartyId: 123,
        userSignees: [unsignedOrgSignee],
        canSign: false,
        expected: 'notSigning',
      },
      {
        description: 'User not in list but can sign',
        currentUserPartyId: 999,
        userSignees: [unsignedOrgSignee],
        canSign: true,
        expected: 'awaitingSignature',
      },
      {
        description: 'Empty signee list with sign permission',
        currentUserPartyId: 123,
        userSignees: [],
        canSign: true,
        expected: 'awaitingSignature',
      },
      {
        description: 'Has unsigned signees',
        currentUserPartyId: 123,
        userSignees: [signedSignee, unsignedOrgSignee],
        canSign: true,
        expected: 'awaitingSignature',
      },
      {
        description: 'All signees signed and current user person is not in the list',
        currentUserPartyId: 123,
        userSignees: [signedSignee, signedOrgSignee],
        canSign: true,
        expected: 'signed',
      },
      {
        description: 'No matching signee current user person is not in the list',
        currentUserPartyId: 123,
        userSignees: [],
        canSign: true,
        expected: 'awaitingSignature',
      },
      {
        description: 'All signees have signed including current user as person',
        currentUserPartyId: currentUserSignee.partyId,
        userSignees: [{ ...currentUserSignee, hasSigned: true }, signedSignee, signedOrgSignee],
        canSign: true,
        expected: 'signed',
      },
    ];

    testCases.forEach(({ description, currentUserPartyId, userSignees, canSign, expected }) => {
      it(`should return "${expected}" when ${description}`, () => {
        const result = getCurrentUserStatus(currentUserPartyId, userSignees, canSign);
        expect(result).toBe(expected);
      });
    });
  });
});
