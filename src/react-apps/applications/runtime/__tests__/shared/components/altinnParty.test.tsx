import { mount, ReactWrapper } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import AltinnParty from '../../../src/shared/components/altinnParty';
import { IParty } from '../../../src/shared/resources/party';

describe('altinnParty', () => {
  let mountedComponent: ReactWrapper;
  let mockParty: IParty;
  let selectedParty: IParty;
  let onSelectPartyMock: (party: IParty) => void;
  let createStore: any;
  let mockStore: any;

  beforeEach(() => {
    mockParty = {
      childParties: [],
      partyId: 'partyId',
      partyTypeName: 1,
      orgNumber: null,
      ssn: 'ssn',
      unitType: 'test',
      name: 'Testing Testing',
      isDeleted: false,
      onlyHierarchyElementWithNoAccess: false,
    };
    selectedParty = null;
    onSelectPartyMock = (party: IParty) => selectedParty = party;
    createStore = configureStore();
    mockStore = createStore({
      language: {
        language: [],
      },
    });
    mountedComponent = mount(
      <Provider store={mockStore}>
        <AltinnParty
          party={mockParty}
          onSelectParty={onSelectPartyMock}
          showSubUnits={true}
        />
      </Provider>,
    );
  });

  it('should use callback to select party', () => {
    mountedComponent.simulate('click');
    expect(selectedParty).toEqual(mockParty);
  });

  describe('should render with correct icon based on what kind of party it is', () => {
    it('should render with class \'fa fa-private\' if party is a person', () => {
      mockParty = {
        childParties: [],
        partyId: 'partyId',
        partyTypeName: 1,
        orgNumber: null,
        ssn: 'ssn',
        unitType: 'test',
        name: 'Testing Testing',
        isDeleted: false,
        onlyHierarchyElementWithNoAccess: false,
      };
      mountedComponent = mount(
        <Provider store={mockStore}>
          <AltinnParty
            party={mockParty}
            onSelectParty={onSelectPartyMock}
            showSubUnits={true}
          />
        </Provider>,
      );
      mountedComponent.containsMatchingElement(
        <i className={'partyIcon fa fa-private'}/>,
      );
    });

    it('should render with class \'fa fa-corp\' if party is a organization', () => {
      mockParty = {
        childParties: [],
        partyId: 'partyId',
        partyTypeName: 1,
        orgNumber: 1000000,
        ssn: 'ssn',
        unitType: 'test',
        name: 'Testing Testing',
        isDeleted: false,
        onlyHierarchyElementWithNoAccess: false,
      };
      mountedComponent = mount(
        <Provider store={mockStore}>
          <AltinnParty
            party={mockParty}
            onSelectParty={onSelectPartyMock}
            showSubUnits={true}
          />
        </Provider>,
      );
      mountedComponent.containsMatchingElement(
        <i className={'partyIcon fa fa-corp'}/>,
      );
    });
  });
});
