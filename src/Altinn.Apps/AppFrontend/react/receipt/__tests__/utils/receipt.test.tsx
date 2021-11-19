import 'jest';
import {IData, IInstance, IParty} from '../../../shared/src/types/index';
import { getInstanceMetaDataObject } from '../../src/utils/receipt';

describe('>>> utils/receipt.test.tsx', () => {
  let mockInstance: IInstance;
  let mockPartyPerson: IParty;
  let mockPartyOrg: IParty;
  let mockLanguage: any;
  let mockOrganisations: any;
  let expectedResult: any;
  let mockApplication: any;

  beforeEach(() => {
    mockInstance = {
      data: [
        {dataType: 'default', lastChanged: new Date(2018, 11, 24, 10, 33)} as IData,
      ],
      org: 'testOrg',
    } as IInstance;
    mockPartyPerson = {
      name: 'Ola Nordmann',
      ssn: '12345678',
    } as IParty;
    mockPartyOrg = {
      name: 'FIRMA AS',
      orgNumber: 12345,
    } as IParty;
    mockLanguage = {
      receipt_platform: {
        date_sent: 'Dato sendt',
        sender: 'Avsender',
        receiver: 'Mottaker',
        reference_number: 'Referansenummer',
      },
    };
    mockOrganisations = {
      orgs: {
        testOrg: {
          name: {
            nb: 'TEST ORG',
          },
        },
      },
    };
    expectedResult = {
      'Dato sendt': '24.12.2018 / 10:33',
      'Avsender': '12345678-Ola Nordmann',
      'Mottaker': 'TEST ORG',
      'Referansenummer': 'd6a414a797ae',
    };
    mockApplication = {
      dataTypes: [{appLogic: true, id: 'default'}],
    };
  });
  it('+++ should return instance metadata object with correct values for person', () => {

    const result = getInstanceMetaDataObject(mockInstance, mockPartyPerson, mockLanguage, mockOrganisations, mockApplication);
    expect(result).toEqual(expectedResult);
  });

  it('+++ should return instance metadata object with correct values for org', () => {

    const result = getInstanceMetaDataObject(mockInstance, mockPartyOrg, mockLanguage, mockOrganisations, mockApplication);
    const expectedOrgResult = expectedResult;
    expectedOrgResult.Avsender = '12345-FIRMA AS';
    expect(result).toEqual(expectedOrgResult);
  });
});
