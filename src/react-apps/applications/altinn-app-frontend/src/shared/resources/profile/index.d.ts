import { IParty } from '../party';

export interface IProfile {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  partyId: number;
  party: IParty;
  userType: number;
}
