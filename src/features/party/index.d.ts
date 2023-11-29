export interface IPartyValidationResponse {
  valid: boolean;
  message: string | null;
  validParties: unknown[];
}
