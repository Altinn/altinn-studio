/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { AccessControlContainerClass, IAccessControlContainerProps, IAccessControlContainerState, PartyTypes} from '../src/features/accessControl/containers/AccessControlContainer';

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
      subscriptionHook: {
        editionCode: 'Current edition code',
        serviceCode: 'Current service code',
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
      subscriptionHook: {
        editionCode: 'New edition code',
        serviceCode: 'New service code',
      },
    };
    accessContainerState = {
      partyTypesAllowed: currentApplicationMetadata.partyTypesAllowed,
      subscriptionHook: currentApplicationMetadata.subscriptionHook,
      showSubscriptionHook: true,
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

  it('should correctly update subscriptionHook state when handleSubscriptionHookValuesChanged is triggered', () => {
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={currentApplicationMetadata}
        language={{}}
        classes={{}}
      />);
    const instance = wrapper.instance() as AccessControlContainerClass;
    instance.handleSubscriptionHookValuesChanged('serviceCode', {target: {value: 'value1'}});
    instance.handleSubscriptionHookValuesChanged('editionCode', {target: {value: 'value2'}});
    expect(wrapper.state('subscriptionHook')).toEqual({ editionCode: 'value2', serviceCode: 'value1' });
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

  it('should call save on both handleSubscriptionHookValuesOnBlur and handleSubscriptionHookChange', () => {
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={currentApplicationMetadata}
        language={{}}
        classes={{}}
      />);
    const instance = wrapper.instance() as AccessControlContainerClass;
    const spy = jest.spyOn(instance, 'saveApplicationMetadata');
    instance.handleSubscriptionHookValuesOnBlur();
    instance.handleSubscriptionHookChange();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('constructor should initiate partyTypesAllowed and subscriptionHook with empty values if passed as null', () => {
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
    expect(wrapper.state('subscriptionHook')).toEqual({
      serviceCode: '',
      editionCode: '',
    });
  });
});
