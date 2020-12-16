// tslint:disable: max-line-length
import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import configureStore from 'redux-mock-store';
import { getInitialStateMock } from '../../__mocks__/mocks';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ReceiptContainer, { returnInstanceMetaDataObject } from '../../src/features/receipt/containers/receiptContainer';
import { IData } from '../../../shared/src';

function mockDataElements() : IData[] {
  return [
    {
      id: '1C75319C-DBA2-485D-9EF7-BE3D0F4F0B5B',
      contentType: 'application/pdf',
      dataType: 'ref-data-as-pdf',
      filename: 'data-as.pdf',
      locked: true,
      refs: [],
      selfLinks: {
        apps: 'applink',
        platform: "platformlink",
      },
      blobStoragePath: 'blobpath',
      size: 23,
      created: new Date('2020-01-01'),
      createdBy: 'me',
      lastChanged: new Date('2020-01-01'),
      lastChangedBy: 'me'
    }
  ]
}

describe('Testing functions in ReceiptContainer', () => {
  let mockStore: any;

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

  it('+++ KAJSDLAS ASD ASD ASD ASD ASD ASD ASD ', () => {
    const createStore = configureStore();

    const newState = getInitialStateMock();
    newState.applicationMetadata.applicationMetadata.autoDeleteOnProcessEnd = true;
    newState.instanceData.instance.data = mockDataElements();

    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ReceiptContainer />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper).toMatchSnapshot();
  });

});
