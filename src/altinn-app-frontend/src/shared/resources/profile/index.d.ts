import { IParty } from '../../../../../../shared/src/types';

export interface IProfile {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  partyId: number;
  party: IParty;
  userType: number;
}
