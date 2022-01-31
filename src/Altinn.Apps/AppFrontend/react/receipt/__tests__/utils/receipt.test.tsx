import 'jest';
import {IAltinnOrg, IAltinnOrgs, IApplication, IData, IInstance, ILanguage, IParty, ITextResource} from '../../../shared/src/types/index';
import { getInstanceMetaDataObject } from '../../src/utils/receipt';

describe('utils > receipt', () => {
  const instance = {
    data: [
      {dataType: 'default', lastChanged: new Date(2018, 11, 24, 10, 33)} as IData,
    ],
    org: 'testOrg',
  } as IInstance;
  const partyPerson = {
    name: 'Ola Nordmann',
    ssn: '12345678',
  } as IParty;
  const partyOrg = {
    name: 'FIRMA AS',
    orgNumber: 12345,
  } as IParty;
  const language: ILanguage = {
    receipt_platform: {
      date_sent: 'Dato sendt',
      sender: 'Avsender',
      receiver: 'Mottaker',
      reference_number: 'Referansenummer',
    },
  };
  const organisations: IAltinnOrgs = {
    testOrg: {
      name: {
        nb: 'TEST ORG',
      },
    } as unknown as IAltinnOrg,
  };
  const expectedResult = {
    'Dato sendt': '24.12.2018 / 10:33',
    'Avsender': '12345678-Ola Nordmann',
    'Mottaker': 'TEST ORG',
    'Referansenummer': 'd6a414a797ae',
  };
  const application = {
    dataTypes: [{appLogic: true, id: 'default'}],
  } as IApplication;

  it('should return instance metadata object with correct values for person', () => {
    const result = getInstanceMetaDataObject(instance, partyPerson, language, organisations, application, [], 'nb');
    expect(result).toEqual(expectedResult);
  });

  it('should return instance metadata object with correct values for org', () => {
    const result = getInstanceMetaDataObject(instance, partyOrg, language, organisations, application, [], 'nb');
    const expectedOrgResult = expectedResult;
    expectedOrgResult.Avsender = '12345-FIRMA AS';
    expect(result).toEqual(expectedOrgResult);
  });

  it('should display appOwner name from text resources if defined', () => {
    const textResourceWithAppOwner: ITextResource[] = [{
      id: 'appOwner',
      value: 'Name from resources'
    }];
    const result = getInstanceMetaDataObject(instance, partyOrg, language, organisations, application, textResourceWithAppOwner, 'nb');
    expect(result.Mottaker).toEqual('Name from resources');
  });
});
