/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { AccessControlContainerClass, IAccessControlContainerProps, IAccessControlContainerState, PartyTypes} from '../../features/accessControl/containers/AccessControlContainer';

describe('AccessControl', () => {
  let nextAccessContainerProps: IAccessControlContainerProps;
  let currentAccessContainerProps: IAccessControlContainerProps;
  let accessContainerState: IAccessControlContainerState;
  let currentApplicationMetadata: any;
  let newApplicationMetadata: any;

  beforeEach(() => {
    currentApplicationMetadata = {
      partyTypesAllowed: {
        bankruptcyEstate: false,
        subUnit: true,
        person: false,
        organisation: true,
      },
    };
    newApplicationMetadata = {
      // must be opposite of currentApplicationMetadata.partyTypesAllowed
      partyTypesAllowed: {
        bankruptcyEstate: true,
        subUnit: false,
        person: true,
        organisation: false,
      },
    };
    accessContainerState = {
      partyTypesAllowed: currentApplicationMetadata.partyTypesAllowed,
    };
    nextAccessContainerProps = {
      applicationMetadata: newApplicationMetadata,
      language: {},
      classes: {},
    };
    currentAccessContainerProps = {
      applicationMetadata: currentApplicationMetadata,
      language: {},
      classes: {},
    };
  });

  it('getDerivedStateFromProps should only return object on changed state', () => {
    const shouldUpdateOnEqualProps = AccessControlContainerClass.getDerivedStateFromProps(
      nextAccessContainerProps,
      accessContainerState);
    const shouldNotUpdateOnNewProps = AccessControlContainerClass.getDerivedStateFromProps(
      currentAccessContainerProps,
      accessContainerState,
    );
    const shouldNotUpdateOnNullValues = AccessControlContainerClass.getDerivedStateFromProps(
      {
        applicationMetadata: {},
        language: {},
        classes: {},
      },
      accessContainerState);
    expect(shouldUpdateOnEqualProps).not.toBe(null);
    expect(shouldNotUpdateOnNewProps).toBe(null);
    expect(shouldNotUpdateOnNullValues).toBe(null);
  });

  it('should correctly update partyTypesAllowed state when handlePartyTypesAllowedChange is triggered', () => {
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={currentApplicationMetadata}
        language={{}}
        classes={{}}
      />);
    const instance = wrapper.instance() as AccessControlContainerClass;
    instance.handlePartyTypesAllowedChange(PartyTypes.bankruptcyEstate);
    instance.handlePartyTypesAllowedChange(PartyTypes.organisation);
    instance.handlePartyTypesAllowedChange(PartyTypes.person);
    instance.handlePartyTypesAllowedChange(PartyTypes.subUnit);
    expect(wrapper.state('partyTypesAllowed')).toEqual(newApplicationMetadata.partyTypesAllowed);
  });

  it('constructor should initiate partyTypesAllowed with empty values if passed as null', () => {
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={{}}
        language={{}}
        classes={{}}
      />);
    expect(wrapper.state('partyTypesAllowed')).toEqual({
      bankruptcyEstate: false,
      organisation: false,
      person: false,
      subUnit: false,
    });
  });
});
