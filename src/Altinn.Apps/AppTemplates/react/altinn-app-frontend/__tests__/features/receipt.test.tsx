
import 'jest';
import { returnInstanceMetaDataObject } from './../../src/features/receipt/containers/receiptContainer';

describe('Testing functions in ReceiptContainer', () => {
  test('returnInstanceMetaDataObject() returns correct object', () => {
    const testData = {
      orgsData: {
        tdd: {
          name: {
            en: 'Test Ministry',
            nb: 'Testdepartementet',
            nn: 'Testdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
        },
        ttd: {
          name: {
            en: 'Test Ministry',
            nb: 'Testdepartementet',
            nn: 'Testdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
        },
      },
      languageData: null,
      profileData: {
        profile: {
          userId: 1,
          userName: 'OlaNordmann',
          phoneNumber: '90012345',
          email: 'ola@altinncore.no',
          partyId: 50001,
          party: {
            partyId: 50001,
            partyTypeName: 1,
            orgNumber: null,
            ssn: null,
            unitType: null,
            name: 'Ola Privatperson',
            isDeleted: false,
            onlyHierarchyElementWithNoAccess: false,
            person: {
              ssn: '01017512345',
              name: null,
              firstName: 'Ola',
              middleName: null,
              lastName: 'Privatperson',
              telephoneNumber: null,
              mobileNumber: null,
              mailingAddress: null,
              mailingPostalCode: null,
              mailingPostalCity: null,
              addressMunicipalNumber: null,
              addressMunicipalName: null,
              addressStreetName: null,
              addressHouseNumber: null,
              addressHouseLetter: null,
              addressPostalCode: null,
              addressCity: null,
            },
            organisation: null,
          },
          userType: 1,
          profileSettingPreference: null,
        },
      },
      instanceGuid: '6697de17-18c7-4fb9-a428-d6a414a797ae',
      userLanguageString: 'nb',
      lastChangedDateTime: '22.08.2019 / 09:08',
      instance: {
        org: 'tdd',
      },
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Privatperson',
        ssn: '01017512345'
      }
    };

    const expected = {
      'receipt.date_sent': '22.08.2019 / 09:08',
      'receipt.receiver': 'Testdepartementet',
      'receipt.ref_num': 'd6a414a797ae',
      'receipt.sender': '01017512345-Ola Privatperson',
    };

    expect(returnInstanceMetaDataObject(
      testData.orgsData,
      testData.languageData,
      testData.instanceOwnerParty,
      testData.instanceGuid,
      testData.userLanguageString,
      testData.lastChangedDateTime,
      testData.instance.org,
    )).toEqual(expected);
  });

});
