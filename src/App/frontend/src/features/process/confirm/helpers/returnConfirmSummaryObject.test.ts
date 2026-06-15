import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import { returnConfirmSummaryObject } from 'src/features/process/confirm/helpers/returnConfirmSummaryObject';
import type { IParty } from 'src/types/shared';

const langTools = staticUseLanguageForTests({ language: {} });

describe('returnConfirmSummaryObject', () => {
  it('should return sender with ssn prefix when ssn is present', () => {
    const result = returnConfirmSummaryObject({
      langTools,
      instanceOwnerParty: {
        partyId: 50001,
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
      langTools,
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Privatperson',
        ssn: '01017512345',
        orgNumber: '987654321',
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
      langTools,
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Bedrift',
        orgNumber: '987654321',
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: '987654321-Ola Bedrift',
      },
    });
  });

  it('should return sender as name only when neither ssn nor orgNumber is present', () => {
    const result = returnConfirmSummaryObject({
      langTools,
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Selvidentifisert',
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: 'Ola Selvidentifisert',
      },
    });
  });

  it('should return sender as name only when ssn and orgNumber are null', () => {
    const result = returnConfirmSummaryObject({
      langTools,
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Selvidentifisert',
        ssn: null,
        orgNumber: null,
      } as IParty,
    });

    expect(result).toEqual({
      'confirm.sender': {
        value: 'Ola Selvidentifisert',
      },
    });
  });

  it('should return sender as empty string when instanceOwnerParty is not present', () => {
    const result = returnConfirmSummaryObject({ langTools });

    expect(result).toEqual({
      'confirm.sender': {
        value: '',
      },
    });
  });

  it('should return custom value for confirm.sender if key is supplied in text resources', () => {
    const result = returnConfirmSummaryObject({
      langTools: staticUseLanguageForTests({ textResources: { 'confirm.sender': { value: 'Some custom value' } } }),
      instanceOwnerParty: {
        partyId: 50001,
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
