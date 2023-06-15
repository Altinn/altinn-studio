import { returnConfirmSummaryObject } from 'src/features/confirm/helpers/returnConfirmSummaryObject';
import type { IParty } from 'src/types/shared';

describe('returnConfirmSummaryObject', () => {
  it('should return sender with ssn prefix when ssn is present', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
      instanceOwnerParty: {
        partyId: '50001',
        name: 'Ola Privatperson',
        ssn: '01017512345',
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '01017512345-Ola Privatperson',
      },
    });
  });

  it('should return sender with ssn prefix when both ssn and orgNumber is present', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
      instanceOwnerParty: {
        partyId: '50001',
        name: 'Ola Privatperson',
        ssn: '01017512345',
        orgNumber: 987654321,
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '01017512345-Ola Privatperson',
      },
    });
  });

  it('should return sender with orgNumber prefix when orgNumber is present', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
      instanceOwnerParty: {
        partyId: '50001',
        name: 'Ola Bedrift',
        orgNumber: 987654321,
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '987654321-Ola Bedrift',
      },
    });
  });

  it('should return sender as empty string when neither ssn or orgNumber is present', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
      instanceOwnerParty: {
        partyId: '50001',
        name: 'Ola Bedrift',
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '',
      },
    });
  });

  it('should return sender as empty string when instanceOwnerParty is not present', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '',
      },
    });
  });

  it('should return custom value for confirm.sender if key is supplied in text resources', () => {
    const result = returnConfirmSummaryObject({
      languageData: {},
      textResources: [{ id: 'confirm.sender', value: 'Some custom value' }],
      instanceOwnerParty: {
        partyId: '50001',
        name: 'Ola Privatperson',
        ssn: '01017512345',
      } as IParty,
    });

    expect(result).toEqual({
      'Some custom value': {
        value: '01017512345-Ola Privatperson',
      },
    });
  });
});
